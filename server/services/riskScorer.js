/**
 * Deterministic, explainable brand risk scoring
 * Outputs:
 * - riskScore (0 to 100)
 * - riskLevel ('critical' | 'high' | 'medium' | 'low')
 * - riskDrivers (array of explanation strings)
 */

const CATEGORY_WEIGHTS = {
  factual_contradiction: 45,
  claims: 40,
  unsupported_claim: 40,
  banned_term: 35,
  terminology: 30,
  logo_misuse: 35,
  off_palette: 25,
  tone: 20,
  messaging: 20,
  accessibility: 15
};

const REGULATED_PATTERNS = [
  /\bguarantee(?:d)?\b/i,
  /\b100\s*%\b/i,
  /\bcure(?:s)?\b/i,
  /\bfree\b/i,
  /\bbest\b/i,
  /\bonly\b/i,
  /\blowest price\b/i,
  /\bcertified\b/i,
  /\bproven\b/i
];

const CHANNEL_MULTIPLIERS = {
  'press_release': 1.4,
  'paid_ad': 1.3,
  'ad': 1.3,
  'billboard': 1.3,
  'website': 1.1,
  'social': 1.0,
  'email': 0.9,
  'internal': 0.7
};

function calculateFindingRisk(finding, channel = 'social') {
  let score = 0;
  const drivers = [];

  // 1. Category Base Weight
  const catKey = (finding.category || '').toLowerCase().replace(/[-\s]/g, '_');
  let baseWeight = CATEGORY_WEIGHTS[catKey] || 25;

  if (finding.sourceType === 'fact' || catKey === 'claims') {
    baseWeight = Math.max(baseWeight, 40);
    drivers.push(`Factual or promotional claim issue (+${baseWeight})`);
  } else if (finding.sourceType === 'term' || catKey === 'banned_term') {
    baseWeight = Math.max(baseWeight, 35);
    drivers.push(`Disallowed term or terminology violation (+${baseWeight})`);
  } else if (catKey.includes('logo')) {
    baseWeight = Math.max(baseWeight, 35);
    drivers.push(`Brand identity / logo misuse (+${baseWeight})`);
  } else {
    drivers.push(`${finding.category || 'Brand guideline'} violation (+${baseWeight})`);
  }
  score += baseWeight;

  // 2. Confidence & Severity Adjustment
  if (finding.severity === 'high') {
    score += 15;
    drivers.push('High severity designation (+15)');
  } else if (finding.severity === 'low') {
    score -= 10;
    drivers.push('Low severity mitigation (-10)');
  }

  if (finding.confidence === 'clear') {
    score += 10;
    drivers.push('High certainty / clear rule match (+10)');
  } else if (finding.confidence === 'unverified') {
    score -= 15;
    drivers.push('Unverified status dampening (-15)');
  }

  // 3. Regulated or Absolute Superlative Wording Check
  const quote = (finding.quote || '') + ' ' + (finding.reason || '');
  const matchedRegulated = [];
  for (const regex of REGULATED_PATTERNS) {
    const match = quote.match(regex);
    if (match) {
      matchedRegulated.push(match[0].toLowerCase());
    }
  }

  if (matchedRegulated.length > 0) {
    const uniqueMatches = [...new Set(matchedRegulated)];
    const bonus = Math.min(20, uniqueMatches.length * 10);
    score += bonus;
    drivers.push(`Absolute or regulated claims: "${uniqueMatches.join(', ')}" (+${bonus})`);
  }

  // 4. Channel Reach Multiplier
  const chKey = (channel || 'social').toLowerCase();
  const mult = CHANNEL_MULTIPLIERS[chKey] || 1.0;
  if (mult !== 1.0) {
    const adjusted = Math.round(score * mult);
    const diff = adjusted - score;
    score = adjusted;
    drivers.push(`Channel reach adjustment (${channel}: ×${mult}, ${diff >= 0 ? '+' : ''}${diff})`);
  }

  // Clamp 0..100
  score = Math.max(0, Math.min(100, score));

  // Determine Level
  let level = 'low';
  if (score >= 75) {
    level = 'critical';
  } else if (score >= 50) {
    level = 'high';
  } else if (score >= 25) {
    level = 'medium';
  }

  return {
    riskScore: score,
    riskLevel: level,
    riskDrivers: drivers
  };
}

/**
 * Calculates aggregated draft-level risk score and statistics
 */
function calculateDraftRisk(findings = [], channel = 'social') {
  const openFindings = findings.filter(f => f.status === 'open');
  if (openFindings.length === 0) {
    return {
      riskScore: 0,
      riskLevel: 'low',
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0
    };
  }

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const f of openFindings) {
    const level = f.riskLevel || (f.severity === 'high' ? 'high' : 'medium');
    if (level === 'critical') criticalCount++;
    else if (level === 'high') highCount++;
    else if (level === 'medium') mediumCount++;
    else lowCount++;
  }

  // Max individual score + diminishing returns of secondary issues
  const sortedScores = openFindings.map(f => f.riskScore || 0).sort((a, b) => b - a);
  let totalScore = sortedScores[0] || 0;

  for (let i = 1; i < sortedScores.length; i++) {
    totalScore += sortedScores[i] * (0.2 / i);
  }

  const finalScore = Math.min(100, Math.round(totalScore));
  let level = 'low';
  if (finalScore >= 75 || criticalCount > 0) level = 'critical';
  else if (finalScore >= 50 || highCount > 0) level = 'high';
  else if (finalScore >= 25 || mediumCount > 0) level = 'medium';

  return {
    riskScore: finalScore,
    riskLevel: level,
    criticalCount,
    highCount,
    mediumCount,
    lowCount
  };
}

module.exports = {
  calculateFindingRisk,
  calculateDraftRisk,
  CATEGORY_WEIGHTS,
  REGULATED_PATTERNS
};
