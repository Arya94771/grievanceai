/**
 * Claim Normalizer for Indian marketing copy:
 * Parses currencies (₹, Rs., INR, lakh, crore), percentages,
 * dates (multiple formats), ranges, quantities, and absolute/superlative terms.
 */

// Currency patterns: supports ₹, Rs., INR prefixes OR standalone numbers followed by lakh/crore/k
const CURRENCY_REGEX = /(?:(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)\s*(lakh|crore|k)?|([\d,]+(?:\.\d+)?)\s*(lakh|crore)\b)/gi;

// Percentage patterns
const PERCENTAGE_REGEX = /(\d+(?:\.\d+)?)\s*%/g;

// Numeric Range patterns (e.g. "1,200m to 1,500m", "₹400 - ₹600")
const RANGE_REGEX = /(?:between\s+)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi;

// Absolute / Superlative claims
const SUPERLATIVE_TERMS = [
  'best', 'only', 'guaranteed', '100%', 'cure', 'cures',
  'cheapest', 'lowest price', 'first', 'purest', 'zero acidity',
  'miracle', 'revolutionary'
];

/**
 * Normalizes Indian currency strings to numeric values
 * e.g. "₹1,20,000" -> 120000, "Rs. 2.5 lakh" -> 250000, "INR 1.2 crore" -> 12000000
 */
function parseIndianCurrency(rawStr = '') {
  if (!rawStr) return [];
  const matches = [];
  let match;
  CURRENCY_REGEX.lastIndex = 0;

  while ((match = CURRENCY_REGEX.exec(rawStr)) !== null) {
    const numPart = match[1] || match[3];
    const unitPart = match[2] || match[4] || '';
    let numStr = numPart.replace(/,/g, '');
    let val = parseFloat(numStr);
    const unit = unitPart.toLowerCase();

    if (unit === 'lakh') {
      val = val * 100000;
    } else if (unit === 'crore') {
      val = val * 10000000;
    } else if (unit === 'k') {
      val = val * 1000;
    }

    matches.push({
      raw: match[0].trim(),
      amount: val,
      index: match.index
    });
  }

  return matches;
}

/**
 * Parses percentages from text
 */
function parsePercentages(rawStr = '') {
  if (!rawStr) return [];
  const matches = [];
  let match;
  PERCENTAGE_REGEX.lastIndex = 0;

  while ((match = PERCENTAGE_REGEX.exec(rawStr)) !== null) {
    matches.push({
      raw: match[0],
      percent: parseFloat(match[1]),
      index: match.index
    });
  }
  return matches;
}

/**
 * Extracts superlative or absolute claims from text
 */
function extractSuperlativeClaims(rawStr = '') {
  if (!rawStr) return [];
  const lower = rawStr.toLowerCase();
  const found = [];

  for (const term of SUPERLATIVE_TERMS) {
    const regex = new RegExp(`\\b${term.replace('%', '\\%')}\\b`, 'i');
    const match = lower.match(regex);
    if (match) {
      found.push({
        term,
        matched: match[0]
      });
    }
  }

  return found;
}

/**
 * Compares a draft number against canonical approved fact
 * Tolerates 0% difference for strict fact matching (e.g. altitude, price, blend %)
 */
function compareNumericClaim(claimValue, approvedValue, { tolerancePercent = 0 } = {}) {
  const diff = Math.abs(claimValue - approvedValue);
  const maxDiff = approvedValue * (tolerancePercent / 100);
  return {
    matches: diff <= maxDiff,
    diff,
    claimValue,
    approvedValue
  };
}

module.exports = {
  parseIndianCurrency,
  parsePercentages,
  extractSuperlativeClaims,
  compareNumericClaim,
  SUPERLATIVE_TERMS
};
