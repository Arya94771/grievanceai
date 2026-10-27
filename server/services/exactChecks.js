/**
 * GrievanceAI Exact Checks Engine (Plain code, deterministic, zero AI)
 * 
 * Implements:
 * 1. Banned/preferred terms (case-insensitive, whole word boundaries)
 * 2. Excessive exclamation marks
 * 3. ALL-CAPS shouting
 * 4. "Click here" / ambiguous link text
 * 5. Missing alt-text wording for image references
 */

/**
 * Escapes regex special characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Run exact deterministic checks on text against brand terms & hardcoded governance rules.
 * 
 * @param {string} text - The draft content to inspect
 * @param {Array} terms - List of Term documents from MongoDB ({ preferred, banned: [], note, _id })
 * @returns {Array} List of finding objects
 */
function runExactChecks(text, terms = []) {
  if (!text || typeof text !== 'string') return [];

  const findings = [];

  // Helper to push a finding
  function addFinding({
    quote,
    start,
    end,
    category,
    severity,
    confidence = 'clear',
    sourceType,
    sourceId,
    sourceText,
    reason,
    suggestion
  }) {
    findings.push({
      quote,
      start,
      end,
      category,
      severity,
      confidence,
      sourceType,
      sourceId,
      sourceText: sourceText || '',
      reason,
      suggestion: suggestion || '',
      status: 'open'
    });
  }

  // 1. BANNED / PREFERRED TERMS (Whole word, case-insensitive)
  if (Array.isArray(terms)) {
    for (const termDoc of terms) {
      const preferred = termDoc.preferred || '';
      const bannedList = Array.isArray(termDoc.banned) ? termDoc.banned : [];

      for (const bannedWord of bannedList) {
        if (!bannedWord || !bannedWord.trim()) continue;

        // Word boundary matching (case-insensitive)
        const escaped = escapeRegex(bannedWord.trim());
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          const matchQuote = match[0];
          const start = match.index;
          const end = start + matchQuote.length;

          // Match case of original if title-cased or upper
          let smartSuggestion = preferred;
          if (matchQuote === matchQuote.toUpperCase() && matchQuote.length > 1) {
            smartSuggestion = preferred.toUpperCase();
          } else if (matchQuote[0] === matchQuote[0].toUpperCase()) {
            smartSuggestion = preferred.charAt(0).toUpperCase() + preferred.slice(1);
          }

          addFinding({
            quote: matchQuote,
            start,
            end,
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: `TERM-${termDoc._id || 'BANNED'}`,
            sourceText: `Banned: "${bannedWord}" → Preferred: "${preferred}"`,
            reason: `Uses banned terminology "${matchQuote}". Brand policy strictly mandates using "${preferred}". ${termDoc.note ? `(${termDoc.note})` : ''}`,
            suggestion: smartSuggestion
          });
        }
      }
    }
  }

  // 2. "CLICK HERE" / AMBIGUOUS LINK TEXT
  // Patterns like: click here, tap here, read more, this link, visit here
  const ambiguousLinkRegex = /\b(click\s+here|tap\s+here|read\s+more|this\s+link|visit\s+here|here\s+to)\b/gi;
  let linkMatch;
  while ((linkMatch = ambiguousLinkRegex.exec(text)) !== null) {
    const matchQuote = linkMatch[0];
    const start = linkMatch.index;
    const end = start + matchQuote.length;

    addFinding({
      quote: matchQuote,
      start,
      end,
      category: 'accessibility',
      severity: 'high',
      confidence: 'clear',
      sourceType: 'rule',
      sourceId: 'RULE-LINK-TEXT',
      sourceText: 'WCAG 2.4.4 & G-11: Hyperlinks must have descriptive anchor text. Never use generic words like "click here".',
      reason: `Ambiguous call-to-action anchor text "${matchQuote}" impairs accessibility and violates screen-reader standards.`,
      suggestion: 'explore the collection'
    });
  }

  // 3. EXCESSIVE EXCLAMATION MARKS (2 or more exclamation marks)
  const exclamationRegex = /!{2,}/g;
  let exclMatch;
  while ((exclMatch = exclamationRegex.exec(text)) !== null) {
    const matchQuote = exclMatch[0];
    const start = exclMatch.index;
    const end = start + matchQuote.length;

    addFinding({
      quote: matchQuote,
      start,
      end,
      category: 'tone',
      severity: 'medium',
      confidence: 'clear',
      sourceType: 'rule',
      sourceId: 'RULE-EXCLAMATION',
      sourceText: 'Clause G-01: Prohibits aggressive urgency baiting and multiple exclamation points.',
      reason: `Excessive punctuation ("${matchQuote}") creates artificial urgency and detracts from the craft, artisanal brand voice.`,
      suggestion: '.'
    });
  }

  // 4. ALL-CAPS SHOUTING (3 or more words entirely in uppercase)
  // Matches sequences of at least 3 uppercase words of length >= 2
  const allCapsRegex = /\b[A-Z]{2,}(?:\s+[A-Z]{2,}){2,}\b/g;
  let capsMatch;
  while ((capsMatch = allCapsRegex.exec(text)) !== null) {
    const matchQuote = capsMatch[0];
    const start = capsMatch.index;
    const end = start + matchQuote.length;

    // Convert to title case for suggestion
    const titleCaseSuggestion = matchQuote
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    addFinding({
      quote: matchQuote,
      start,
      end,
      category: 'accessibility',
      severity: 'medium',
      confidence: 'clear',
      sourceType: 'rule',
      sourceId: 'RULE-ALLCAPS',
      sourceText: 'Clause G-13: Avoid entire phrases or sentences formatted in ALL CAPS; screen readers spell them letter by letter.',
      reason: `ALL-CAPS shouting ("${matchQuote}") impairs readability and accessibility for assistive devices.`,
      suggestion: titleCaseSuggestion
    });
  }

  // 5. MISSING ALT-TEXT WORDING FOR IMAGE REFERENCES
  // Matches e.g. [Image: Photo of estate sun deck] or ![Image](url) or <img ...>
  const imageTagRegex = /\[Image:\s*([^\]]+)\]|!\[([^\]]*)\]\(([^)]*)\)|<img\s+[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imageTagRegex.exec(text)) !== null) {
    const matchQuote = imgMatch[0];
    const start = imgMatch.index;
    const end = start + matchQuote.length;
    const description = imgMatch[1] || imgMatch[2] || '';

    // Check if alt text is missing or extremely brief (fewer than 4 words)
    const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 4) {
      addFinding({
        quote: matchQuote,
        start,
        end,
        category: 'accessibility',
        severity: 'high',
        confidence: 'clear',
        sourceType: 'rule',
        sourceId: 'RULE-IMAGE-ALT',
        sourceText: 'Clause G-12: All visual asset references must include descriptive alternative text describing subject, context, and environment.',
        reason: `Image reference lacks comprehensive alt text (only ${wordCount} words provided).`,
        suggestion: `[Image: Detailed view of ${description.trim() || 'estate grounds'} with natural morning lighting]`
      });
    }
  }

  return findings;
}

module.exports = {
  runExactChecks
};
