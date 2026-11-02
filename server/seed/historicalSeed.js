const { Draft, Revision, Finding } = require('../models');

/**
 * Seeds 8 weeks of deterministic historical review data (flagged demo: true)
 * Generates historical compliance trend, resolved findings, and realistic override rates
 */
async function seedHistoricalReviews(workspaceId, users = []) {
  console.log('[HistoricalSeed] Generating 8 weeks of deterministic demo review history...');

  // Fixed pseudo-random seed helper
  let seed = 42;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // Clear previous demo history if exists
  await Draft.deleteMany({ workspaceId, isDemoHistory: true });

  const historicalDrafts = [
    { title: 'Monsoon Social Campaign Wk 1', channel: 'social', weeksAgo: 7, violations: 4, compliance: 50 },
    { title: 'Coorg Single-Origin Press Release Wk 2', channel: 'press_release', weeksAgo: 6, violations: 5, compliance: 40 },
    { title: 'Instagram Summer Roast Drop Wk 3', channel: 'social', weeksAgo: 5, violations: 3, compliance: 65 },
    { title: 'Grower Partnership Annual Report Wk 4', channel: 'website', weeksAgo: 4, violations: 2, compliance: 80 },
    { title: 'Paid Ad Billboard Print Bengaluru Wk 5', channel: 'paid_ad', weeksAgo: 3, violations: 4, compliance: 60 },
    { title: 'Email Newsletter - Monsoon Harvest Wk 6', channel: 'email', weeksAgo: 2, violations: 1, compliance: 90 },
    { title: 'Estate Dark Roast Product Page Wk 7', channel: 'website', weeksAgo: 1, violations: 2, compliance: 85 },
    { title: 'Festival Festive Blend Campaign Wk 8', channel: 'social', weeksAgo: 0, violations: 1, compliance: 92 }
  ];

  const categories = ['claims', 'tone', 'terminology', 'accessibility', 'logo_misuse'];
  const rules = ['F-01', 'F-02', 'F-03', 'G-01', 'G-02', 'T-01'];

  for (const item of historicalDrafts) {
    const draftDate = new Date();
    draftDate.setDate(draftDate.getDate() - (item.weeksAgo * 7 + 2));

    const draft = await Draft.create({
      workspaceId,
      title: item.title,
      channel: item.channel,
      content: `Official copy for ${item.title}. Celebrating Coorg artisanal roast traditions with strict brand adherence.`,
      status: 'approved',
      creatorId: users[0] ? users[0]._id : null,
      creatorName: users[0] ? users[0].name : 'Aarav Mehta',
      isDemoHistory: true,
      createdAt: draftDate,
      updatedAt: draftDate
    });

    const findingsToCreate = [];
    for (let i = 0; i < item.violations; i++) {
      const cat = categories[Math.floor(pseudoRandom() * categories.length)];
      const rule = rules[Math.floor(pseudoRandom() * rules.length)];
      const isHigh = pseudoRandom() > 0.6;
      const status = pseudoRandom() > 0.3 ? 'accepted' : (pseudoRandom() > 0.5 ? 'rejected' : 'disputed');

      const findingDate = new Date(draftDate);
      findingDate.setHours(findingDate.getHours() + 1);

      findingsToCreate.push({
        draftId: draft._id,
        quote: `Sample historical statement for ${cat}`,
        category: cat,
        severity: isHigh ? 'high' : 'medium',
        confidence: 'clear',
        sourceType: rule.startsWith('F') ? 'fact' : (rule.startsWith('T') ? 'term' : 'clause'),
        sourceId: rule,
        reason: `Historical audit finding for ${rule}`,
        suggestion: `Approved phrasing matching ${rule}`,
        riskScore: isHigh ? 75 : 40,
        riskLevel: isHigh ? 'high' : 'medium',
        riskDrivers: [`Historical rule match ${rule}`],
        recurrenceFingerprint: `demo_fp_${rule}_${cat}`,
        status,
        decidedBy: 'Priya Sharma (Reviewer)',
        decidedAt: new Date(findingDate.getTime() + 3 * 3600 * 1000),
        decisionNote: status === 'accepted' ? 'Accepted suggestion' : 'Historical dispute rationale',
        createdAt: findingDate
      });
    }

    if (findingsToCreate.length > 0) {
      await Finding.insertMany(findingsToCreate);
    }
  }

  console.log('[HistoricalSeed] Seeded 8 historical review drafts with demo findings.');
}

module.exports = {
  seedHistoricalReviews
};
