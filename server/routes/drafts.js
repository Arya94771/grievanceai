const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  Draft,
  Revision,
  Finding,
  Clause,
  Fact,
  Term,
  Comment,
  AuditLog,
  Workspace
} = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { runFullReview } = require('../services/aiReview');
const { extractTextFromFile } = require('../services/extractor');

// Configure multer for memory storage (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET all drafts for current workspace
router.get('/', authMiddleware, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const drafts = await Draft.find({ workspaceId }).sort({ updatedAt: -1 });

    // Populate findings counts for each draft
    const draftIds = drafts.map(d => d._id);
    const openFindings = await Finding.aggregate([
      { $match: { draftId: { $in: draftIds }, status: 'open' } },
      { $group: { _id: '$draftId', count: { $sum: 1 } } }
    ]);
    const findingsMap = new Map(openFindings.map(f => [String(f._id), f.count]));

    const enrichedDrafts = drafts.map(d => ({
      ...d.toObject(),
      openFindingsCount: findingsMap.get(String(d._id)) || 0
    }));

    res.json(enrichedDrafts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drafts', details: err.message });
  }
});

// CREATE Draft (JSON or File upload)
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { title, channel = 'General', intent = '' } = req.body;
    let content = req.body.content || '';

    // Handle file upload text extraction (.txt, .docx, .pdf)
    if (req.file) {
      try {
        const extracted = await extractTextFromFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        content = extracted;
      } catch (extractErr) {
        return res.status(400).json({ error: `File extraction failed: ${extractErr.message}` });
      }
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Draft title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Draft content is required (paste text or upload a document)' });
    }

    const draft = await Draft.create({
      workspaceId: req.user.workspaceId,
      title: title.trim(),
      channel: channel.trim(),
      intent: intent.trim(),
      content: content.trim(),
      status: 'draft',
      createdBy: req.user.id,
      creatorName: req.user.name
    });

    const revision = await Revision.create({
      draftId: draft._id,
      revisionNumber: 1,
      content: draft.content,
      author: req.user.name,
      authorRole: req.user.role,
      note: 'Initial draft version'
    });

    draft.currentRevisionId = revision._id;
    await draft.save();

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: 'create_draft',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { title: draft.title, channel: draft.channel, contentLength: draft.content.length }
    });

    res.status(201).json({
      draft,
      revision
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create draft', details: err.message });
  }
});

// GET single draft details with current revision and findings
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const [revisions, findings, comments, auditLogs] = await Promise.all([
      Revision.find({ draftId: draft._id }).sort({ revisionNumber: 1 }),
      Finding.find({ draftId: draft._id }).sort({ start: 1 }),
      Comment.find({ draftId: draft._id }).sort({ createdAt: 1 }),
      AuditLog.find({ draftId: draft._id }).sort({ timestamp: -1 })
    ]);

    res.json({
      draft,
      currentRevisionId: draft.currentRevisionId,
      revisions,
      findings,
      comments,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load draft details', details: err.message });
  }
});

// RUN REVIEW (Exact Checks + AI Review Engine)
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    // Fetch workspace brand kit
    const [clauses, facts, terms] = await Promise.all([
      Clause.find({ workspaceId: req.user.workspaceId }),
      Fact.find({ workspaceId: req.user.workspaceId }),
      Term.find({ workspaceId: req.user.workspaceId })
    ]);

    // Run Full Review
    const reviewResult = await runFullReview({
      draftContent: draft.content,
      draftIntent: draft.intent,
      clauses,
      facts,
      terms,
      workspaceId: req.user.workspaceId,
      draftId: draft._id
    });

    // Clear previous un-decided open findings for this draft
    await Finding.deleteMany({ draftId: draft._id, status: 'open' });

    // Persist new findings
    const findingsToInsert = reviewResult.findings.map(f => ({
      draftId: draft._id,
      revisionId: draft.currentRevisionId,
      quote: f.quote,
      start: f.start,
      end: f.end,
      category: f.category,
      severity: f.severity,
      confidence: f.confidence,
      sourceType: f.sourceType,
      sourceId: f.sourceId,
      sourceText: f.sourceText,
      reason: f.reason,
      suggestion: f.suggestion,
      status: 'open',
      createdAt: new Date()
    }));

    const savedFindings = await Finding.insertMany(findingsToInsert);

    // Audit log
    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: 'run_review',
      actor: req.user.name,
      actorRole: req.user.role,
      details: {
        totalFindings: savedFindings.length,
        aiUsed: reviewResult.aiUsed,
        note: reviewResult.note
      }
    });

    res.json({
      message: 'Review completed successfully',
      aiUsed: reviewResult.aiUsed,
      note: reviewResult.note,
      findings: savedFindings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run review', details: err.message });
  }
});

// DECIDE ON A FINDING (Accept, Reject, Dispute)
router.post('/:id/findings/:findingId/decision', authMiddleware, async (req, res) => {
  try {
    const { decision, decisionNote = '' } = req.body;
    if (!['accepted', 'rejected', 'disputed'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be accepted, rejected, or disputed' });
    }

    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const finding = await Finding.findOne({ _id: req.params.findingId, draftId: draft._id });
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    finding.status = decision;
    finding.decidedBy = req.user.name;
    finding.decidedAt = new Date();
    finding.decisionNote = decisionNote;
    await finding.save();

    let newRevision = null;

    // IF ACCEPTED: Apply suggestion to draft text and create new Revision
    if (decision === 'accepted' && finding.suggestion) {
      let updatedContent = draft.content;

      // Replace exact substring
      if (updatedContent.includes(finding.quote)) {
        updatedContent = updatedContent.replace(finding.quote, finding.suggestion);
      } else if (finding.start >= 0 && finding.end <= updatedContent.length) {
        // Fallback to offset replacement
        updatedContent = updatedContent.slice(0, finding.start) + finding.suggestion + updatedContent.slice(finding.end);
      }

      const revCount = await Revision.countDocuments({ draftId: draft._id });
      newRevision = await Revision.create({
        draftId: draft._id,
        revisionNumber: revCount + 1,
        content: updatedContent,
        author: req.user.name,
        authorRole: req.user.role,
        note: `Applied suggestion for [${finding.category}]: "${finding.quote}" → "${finding.suggestion}"`
      });

      draft.content = updatedContent;
      draft.currentRevisionId = newRevision._id;
      draft.updatedAt = new Date();
      await draft.save();

      // Recalculate remaining open findings offsets for this draft
      const remainingFindings = await Finding.find({ draftId: draft._id, status: 'open' });
      for (const rf of remainingFindings) {
        const newStart = updatedContent.indexOf(rf.quote);
        if (newStart !== -1) {
          rf.start = newStart;
          rf.end = newStart + rf.quote.length;
          await rf.save();
        }
      }
    }

    // IF DISPUTED: add comment
    if (decision === 'disputed' && decisionNote) {
      await Comment.create({
        draftId: draft._id,
        findingId: finding._id,
        author: req.user.name,
        authorRole: req.user.role,
        text: `[Disputed Finding on "${finding.quote}"] ${decisionNote}`
      });
    }

    // Log in AuditLog
    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: `${decision}_finding`,
      actor: req.user.name,
      actorRole: req.user.role,
      details: {
        findingId: finding._id,
        quote: finding.quote,
        suggestion: finding.suggestion,
        category: finding.category,
        decisionNote
      }
    });

    res.json({
      message: `Finding marked as ${decision}`,
      finding,
      updatedDraftContent: draft.content,
      newRevision
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record decision', details: err.message });
  }
});

// UPDATE DRAFT CONTENT MANUALLY
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, channel, intent, content, note = 'Manual edit' } = req.body;
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    if (title) draft.title = title.trim();
    if (channel) draft.channel = channel.trim();
    if (intent !== undefined) draft.intent = intent.trim();

    if (content && content.trim() !== draft.content) {
      draft.content = content.trim();
      const revCount = await Revision.countDocuments({ draftId: draft._id });
      const rev = await Revision.create({
        draftId: draft._id,
        revisionNumber: revCount + 1,
        content: draft.content,
        author: req.user.name,
        authorRole: req.user.role,
        note
      });
      draft.currentRevisionId = rev._id;
    }

    draft.updatedAt = new Date();
    await draft.save();

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: 'edit_draft',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { title: draft.title }
    });

    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update draft', details: err.message });
  }
});

module.exports = router;
