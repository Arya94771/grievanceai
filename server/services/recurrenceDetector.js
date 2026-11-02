const crypto = require('crypto');
const { Finding, Draft } = require('../models');

/**
 * Normalizes a quote string: lowercase, collapses whitespace, strips punctuation
 */
function normalizeQuote(quote = '') {
  return quote
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an immutable SHA-256 fingerprint for a finding
 * fingerprint = sha256(workspaceId + ':' + (sourceId || category) + ':' + category + ':' + normalizedQuote)
 */
function computeFindingFingerprint(workspaceId, finding) {
  const ws = String(workspaceId || '');
  const ruleOrSource = String(finding.sourceId || finding.category || 'general').trim().toUpperCase();
  const cat = String(finding.category || 'general').trim().toLowerCase();
  const normQuote = normalizeQuote(finding.quote || finding.reason || '');

  const raw = `${ws}:${ruleOrSource}:${cat}:${normQuote}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Detects recurring findings across distinct drafts or creators
 * Recurring = same fingerprint in >= 2 distinct drafts OR same creator >= 3 times
 */
async function detectRecurrence(workspaceId, currentDraftId, findings = []) {
  if (!findings || findings.length === 0) return findings;

  const enriched = [];

  for (const f of findings) {
    const fp = f.recurrenceFingerprint || computeFindingFingerprint(workspaceId, f);
    
    // Look up occurrences of this fingerprint across other drafts in the workspace
    const priorOccurrences = await Finding.find({
      recurrenceFingerprint: fp,
      draftId: { $ne: currentDraftId }
    }).select('draftId decidedBy status').lean();

    const distinctDrafts = new Set(priorOccurrences.map(o => String(o.draftId)));
    // If found in at least 1 other distinct draft, total distinct drafts is >= 2
    const isRecurring = distinctDrafts.size >= 1;

    enriched.push({
      ...f,
      recurrenceFingerprint: fp,
      isRecurring,
      recurrenceCount: distinctDrafts.size + 1
    });
  }

  return enriched;
}

/**
 * Computes per-rule override / dispute rate to flag "possibly unclear guideline"
 * Threshold: >= 40% reject/dispute rate over >= 5 decisions
 */
async function analyzeRuleHealth(workspaceId) {
  // Aggregate decisions across all findings grouped by sourceId
  const stats = await Finding.aggregate([
    {
      $match: {
        sourceId: { $ne: '', $exists: true },
        status: { $in: ['accepted', 'rejected', 'disputed'] }
      }
    },
    {
      $group: {
        _id: '$sourceId',
        totalDecisions: { $sum: 1 },
        acceptedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        disputedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
        }
      }
    }
  ]);

  const ruleHealth = {};

  for (const item of stats) {
    const total = item.totalDecisions;
    const overrides = item.rejectedCount + item.disputedCount;
    const overrideRate = total > 0 ? Number((overrides / total).toFixed(2)) : 0;
    const isUnclear = total >= 5 && overrideRate >= 0.40;

    ruleHealth[item._id] = {
      ruleId: item._id,
      totalDecisions: total,
      acceptedCount: item.acceptedCount,
      rejectedCount: item.rejectedCount,
      disputedCount: item.disputedCount,
      overrideRate,
      isUnclearGuideline: isUnclear
    };
  }

  return ruleHealth;
}

module.exports = {
  normalizeQuote,
  computeFindingFingerprint,
  detectRecurrence,
  analyzeRuleHealth
};
