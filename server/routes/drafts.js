const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
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
const { authMiddleware, requireRole } = require('../middleware/auth');
const { runFullReview } = require('../services/aiReview');
const { extractTextFromFile } = require('../services/extractor');

// Configure multer for memory storage (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Rate limiter for review endpoint (conforms to Gemini 15 RPM free tier)
const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: {
    error: 'Too many review requests. Free tier limit is 15 requests per minute. Please wait a moment before re-auditing.',
    fallback: true
  },
  standardHeaders: true,
  legacyHeaders: false
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
      { $group: { _id: '$draftId', count: { $sum: 1 }, clearCount: { $sum: { $cond: [{ $eq: ['$confidence', 'clear'] }, 1, 0] } } } }
    ]);
    const findingsMap = new Map(openFindings.map(f => [String(f._id), f]));

    const enrichedDrafts = drafts.map(d => {
      const stats = findingsMap.get(String(d._id)) || { count: 0, clearCount: 0 };
      return {
        ...d.toObject(),
        openFindingsCount: stats.count,
        openClearCount: stats.clearCount
      };
    });

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

// GET single draft details with revisions, findings, comments, and audit logs
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

    const openClearCount = findings.filter(f => f.status === 'open' && f.confidence === 'clear').length;

    res.json({
      draft,
      currentRevisionId: draft.currentRevisionId,
      revisions,
      findings,
      comments,
      auditLogs,
      openClearCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load draft details', details: err.message });
  }
});

// RUN REVIEW (Exact Checks + AI Review Engine)
router.post('/:id/review', authMiddleware, reviewLimiter, async (req, res) => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const [clauses, facts, terms] = await Promise.all([
      Clause.find({ workspaceId: req.user.workspaceId }),
      Fact.find({ workspaceId: req.user.workspaceId }),
      Term.find({ workspaceId: req.user.workspaceId })
    ]);

    const reviewResult = await runFullReview({
      draftContent: draft.content,
      draftIntent: draft.intent,
      clauses,
      facts,
      terms,
      workspaceId: req.user.workspaceId,
      draftId: draft._id
    });

    // Clear previous open findings
    await Finding.deleteMany({ draftId: draft._id, status: 'open' });

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

    if (decision === 'accepted' && finding.suggestion) {
      let updatedContent = draft.content;

      if (updatedContent.includes(finding.quote)) {
        updatedContent = updatedContent.replace(finding.quote, finding.suggestion);
      } else if (finding.start >= 0 && finding.end <= updatedContent.length) {
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

    if (decision === 'disputed' && decisionNote) {
      await Comment.create({
        draftId: draft._id,
        findingId: finding._id,
        author: req.user.name,
        authorRole: req.user.role,
        text: `[Disputed Finding on "${finding.quote}"] ${decisionNote}`
      });
    }

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

// ==================== T9 APPROVAL WORKFLOW ====================

// 1. SUBMIT FOR REVIEW (Creator action)
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    draft.status = 'in_review';
    draft.updatedAt = new Date();
    await draft.save();

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: 'submit_for_review',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { previousStatus: draft.status }
    });

    res.json({
      message: 'Draft submitted for manager review.',
      draft
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit draft', details: err.message });
  }
});

// 2. APPROVE DRAFT (Manager / Reviewer / Admin action)
// Blocked if any 'clear' confidence finding is open unless override reason is provided
router.post('/:id/approve', authMiddleware, requireRole('manager', 'reviewer', 'admin'), async (req, res) => {
  try {
    const { overrideReason } = req.body;
    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    // Check for open 'clear' findings
    const openClearFindings = await Finding.find({
      draftId: draft._id,
      status: 'open',
      confidence: 'clear'
    });

    if (openClearFindings.length > 0 && (!overrideReason || !overrideReason.trim())) {
      return res.status(400).json({
        error: 'APPROVAL_BLOCKED',
        message: `Approval is blocked: ${openClearFindings.length} clear brand violation(s) remain open. An explicit override reason is required to proceed.`,
        openClearCount: openClearFindings.length,
        openFindings: openClearFindings.map(f => ({ quote: f.quote, category: f.category, reason: f.reason }))
      });
    }

    const isOverride = openClearFindings.length > 0 && !!overrideReason;

    draft.status = 'approved';
    draft.updatedAt = new Date();
    await draft.save();

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: isOverride ? 'override_approval' : 'approve_draft',
      actor: req.user.name,
      actorRole: req.user.role,
      details: {
        isOverride,
        overrideReason: overrideReason || null,
        openClearCount: openClearFindings.length,
        unresolvedQuotes: openClearFindings.map(f => f.quote)
      }
    });

    res.json({
      message: isOverride ? 'Draft approved with documented override.' : 'Draft approved successfully.',
      draft,
      isOverride
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve draft', details: err.message });
  }
});

// 3. REQUEST CHANGES (Manager / Reviewer / Admin action)
router.post('/:id/request-changes', authMiddleware, requireRole('manager', 'reviewer', 'admin'), async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'A comment explaining the requested changes is required.' });
    }

    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    draft.status = 'changes_requested';
    draft.updatedAt = new Date();
    await draft.save();

    // Add comment to draft thread
    const newComment = await Comment.create({
      draftId: draft._id,
      author: req.user.name,
      authorRole: req.user.role,
      text: `[Changes Requested]: ${comment.trim()}`
    });

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      draftId: draft._id,
      action: 'request_changes',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { comment: comment.trim() }
    });

    res.json({
      message: 'Changes requested. Draft status updated to changes_requested.',
      draft,
      comment: newComment
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request changes', details: err.message });
  }
});

// 4. POST COMMENT ON DRAFT
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text, findingId = null } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const draft = await Draft.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const comment = await Comment.create({
      draftId: draft._id,
      findingId,
      author: req.user.name,
      authorRole: req.user.role,
      text: text.trim()
    });

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post comment', details: err.message });
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
