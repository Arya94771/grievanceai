const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  Workspace,
  Clause,
  Fact,
  Term,
  Asset,
  AuditLog
} = require('../models');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { seedBrewlineWorkspace } = require('../seed/seeder');
const { processAndSecureImage, saveToGridFS } = require('../services/imageStorage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

// Helper to bump workspace version on brand kit updates (for caching invalidation in T15)
async function bumpWorkspaceVersion(workspaceId) {
  return await Workspace.findByIdAndUpdate(
    workspaceId,
    { $inc: { version: 1 }, updatedAt: new Date() },
    { new: true }
  );
}

// GET all brand kit elements (Read-only access for all roles)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const [clauses, facts, terms, assets, workspace] = await Promise.all([
      Clause.find({ workspaceId }).sort({ clauseId: 1 }),
      Fact.find({ workspaceId }).sort({ factId: 1 }),
      Term.find({ workspaceId }).sort({ createdAt: -1 }),
      Asset.find({ workspaceId }).sort({ createdAt: -1 }),
      Workspace.findById(workspaceId)
    ]);

    res.json({
      workspace,
      clauses,
      facts,
      terms,
      assets,
      stats: {
        totalClauses: clauses.length,
        totalFacts: facts.length,
        totalTerms: terms.length,
        totalAssets: assets.length,
        version: workspace ? workspace.version : 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch brand kit', details: err.message });
  }
});

// ==================== CLAUSES (Admin Only) ====================

router.post('/clauses', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { clauseId, text, category, severity } = req.body;
    if (!clauseId || !text || !category) {
      return res.status(400).json({ error: 'clauseId, text, and category are required' });
    }

    const clause = await Clause.create({
      workspaceId: req.user.workspaceId,
      clauseId: clauseId.trim().toUpperCase(),
      text: text.trim(),
      category,
      severity: severity || 'medium'
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      action: 'add_clause',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { clauseId: clause.clauseId, category: clause.category }
    });

    res.status(201).json(clause);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create clause', details: err.message });
  }
});

// "Paste guidelines" batch parser (Admin Only)
router.post('/clauses/batch-import', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { rawText, defaultCategory = 'messaging', defaultSeverity = 'medium' } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    // Split pasted guidelines by numbered lists (1. , 1) , [G-xx], or double newlines)
    const rawLines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const parsedClauses = [];
    let currentBuffer = '';

    for (const line of rawLines) {
      const isListItem = /^(?:\d+[\.\)]|[-*•]|\[?G-\d+\]?)\s+/i.test(line);
      if (isListItem && currentBuffer) {
        parsedClauses.push(currentBuffer.trim());
        currentBuffer = line.replace(/^(?:\d+[\.\)]|[-*•]|\[?G-\d+\]?)\s+/i, '');
      } else if (isListItem) {
        currentBuffer = line.replace(/^(?:\d+[\.\)]|[-*•]|\[?G-\d+\]?)\s+/i, '');
      } else {
        currentBuffer += (currentBuffer ? ' ' : '') + line;
      }
    }
    if (currentBuffer) {
      parsedClauses.push(currentBuffer.trim());
    }

    if (parsedClauses.length === 0) {
      return res.status(400).json({ error: 'No recognizable clauses could be parsed from text.' });
    }

    // Find the next available numeric index for IDs (e.g., G-21)
    const existingClauses = await Clause.find({ workspaceId: req.user.workspaceId });
    let maxId = 0;
    existingClauses.forEach(c => {
      const match = c.clauseId.match(/G-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });

    const docsToInsert = parsedClauses.map((text, idx) => {
      const nextNum = maxId + 1 + idx;
      const formattedId = `G-${String(nextNum).padStart(2, '0')}`;
      return {
        workspaceId: req.user.workspaceId,
        clauseId: formattedId,
        text,
        category: defaultCategory,
        severity: defaultSeverity
      };
    });

    const inserted = await Clause.insertMany(docsToInsert);
    await bumpWorkspaceVersion(req.user.workspaceId);

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      action: 'batch_import_clauses',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { count: inserted.length }
    });

    res.status(201).json({
      message: `Successfully imported ${inserted.length} clauses.`,
      clauses: inserted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch import clauses', details: err.message });
  }
});

router.put('/clauses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { text, category, severity, clauseId } = req.body;
    const clause = await Clause.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.workspaceId },
      { text, category, severity, clauseId },
      { new: true }
    );
    if (!clause) return res.status(404).json({ error: 'Clause not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json(clause);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update clause', details: err.message });
  }
});

router.delete('/clauses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const clause = await Clause.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!clause) return res.status(404).json({ error: 'Clause not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json({ message: 'Clause deleted successfully', clauseId: clause.clauseId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete clause', details: err.message });
  }
});

// ==================== FACTS (Admin Only) ====================

router.post('/facts', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { factId, statement } = req.body;
    if (!factId || !statement) {
      return res.status(400).json({ error: 'factId and statement are required' });
    }

    const fact = await Fact.create({
      workspaceId: req.user.workspaceId,
      factId: factId.trim().toUpperCase(),
      statement: statement.trim()
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.status(201).json(fact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create fact', details: err.message });
  }
});

router.put('/facts/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { statement, factId } = req.body;
    const fact = await Fact.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.workspaceId },
      { statement, factId },
      { new: true }
    );
    if (!fact) return res.status(404).json({ error: 'Fact not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json(fact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fact', details: err.message });
  }
});

router.delete('/facts/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const fact = await Fact.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!fact) return res.status(404).json({ error: 'Fact not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json({ message: 'Fact deleted successfully', factId: fact.factId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete fact', details: err.message });
  }
});

// ==================== TERMS (Admin Only) ====================

router.post('/terms', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { preferred, banned, note } = req.body;
    if (!preferred || !banned || !banned.length) {
      return res.status(400).json({ error: 'preferred term and at least one banned term are required' });
    }

    const bannedList = Array.isArray(banned) ? banned : banned.split(',').map(s => s.trim()).filter(Boolean);

    const term = await Term.create({
      workspaceId: req.user.workspaceId,
      preferred: preferred.trim(),
      banned: bannedList,
      note: note || ''
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.status(201).json(term);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create term', details: err.message });
  }
});

router.put('/terms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { preferred, banned, note } = req.body;
    const bannedList = Array.isArray(banned) ? banned : banned.split(',').map(s => s.trim()).filter(Boolean);

    const term = await Term.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.workspaceId },
      { preferred, banned: bannedList, note },
      { new: true }
    );
    if (!term) return res.status(404).json({ error: 'Term not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json(term);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update term', details: err.message });
  }
});

router.delete('/terms/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const term = await Term.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!term) return res.status(404).json({ error: 'Term not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json({ message: 'Term deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete term', details: err.message });
  }
});

// ==================== ASSETS (Admin Only) ====================

// Admin Upload Approved Logo (V2)
router.post('/assets/logo', authMiddleware, requireRole('admin'), upload.single('logo'), async (req, res) => {
  try {
    const { name, usageRule, minWidthPercent = 8, clearSpaceRule = '0.5x clear space around logo' } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Asset name and logo image file are required' });
    }

    const secureResult = await processAndSecureImage(req.file.buffer, req.file.originalname, {
      isAdmin: true,
      isSvgBrandAsset: true
    });

    const gridResult = await saveToGridFS(
      secureResult.buffer,
      secureResult.sanitizedName,
      secureResult.mimeType,
      { workspaceId: req.user.workspaceId, assetType: 'logo' }
    );

    const asset = await Asset.create({
      workspaceId: req.user.workspaceId,
      name: name.trim(),
      type: 'logo',
      usageRule: usageRule ? usageRule.trim() : 'Primary corporate logo. Must maintain aspect ratio, minimum size, and 0.5x clear space.',
      imageUrl: gridResult.url,
      gridFsId: gridResult.gridFsId,
      aspectRatio: Number(secureResult.aspectRatio.toFixed(3)),
      minWidthPercent: Number(minWidthPercent) || 8,
      clearSpaceRule: clearSpaceRule.trim(),
      forbiddenTreatments: ['recoloured', 'stretched', 'rotated', 'cropped', 'low-contrast']
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to upload brand logo' });
  }
});

// Admin Save Brand Color Palette (V2)
router.post('/assets/palette', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, usageRule, palette } = req.body;
    if (!name || !Array.isArray(palette) || palette.length === 0) {
      return res.status(400).json({ error: 'Palette name and at least one color swatch are required' });
    }

    const cleanedColors = palette.map(c => ({
      hex: (c.hex || '').trim().toUpperCase(),
      name: (c.name || '').trim(),
      tolerance: Number(c.tolerance) || 12,
      isPrimary: !!c.isPrimary
    })).filter(c => /^#[0-9A-F]{6}$/i.test(c.hex));

    if (cleanedColors.length === 0) {
      return res.status(400).json({ error: 'At least one valid 6-character hex color (e.g. #1B4332) is required' });
    }

    const asset = await Asset.create({
      workspaceId: req.user.workspaceId,
      name: name.trim(),
      type: 'palette',
      usageRule: usageRule ? usageRule.trim() : 'Approved brand color palette for marketing and advertising creatives.',
      palette: cleanedColors
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to save palette' });
  }
});

router.post('/assets', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, usageRule } = req.body;
    if (!name || !usageRule) {
      return res.status(400).json({ error: 'name and usageRule are required' });
    }

    const asset = await Asset.create({
      workspaceId: req.user.workspaceId,
      name: name.trim(),
      usageRule: usageRule.trim()
    });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create asset', details: err.message });
  }
});

router.put('/assets/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, usageRule } = req.body;
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.workspaceId },
      { name, usageRule },
      { new: true }
    );
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update asset', details: err.message });
  }
});

router.delete('/assets/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await bumpWorkspaceVersion(req.user.workspaceId);
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset', details: err.message });
  }
});

// RESET DEMO DATA (Admin Only - T18)
router.post('/reset-demo', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    console.log(`[Demo Reset] Admin ${req.user.name} initiated workspace reset.`);
    await seedBrewlineWorkspace({ forceReset: true });

    await AuditLog.create({
      workspaceId: req.user.workspaceId,
      action: 'reset_demo_workspace',
      actor: req.user.name,
      actorRole: req.user.role,
      details: { timestamp: new Date() }
    });

    res.json({
      message: 'Demo workspace data has been restored to factory seed state.',
      resetAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset demo data', details: err.message });
  }
});

module.exports = router;
