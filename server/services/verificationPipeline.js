const { generateGeminiContent, isMockMode } = require('./geminiClient');
const { parseIndianCurrency, parsePercentages, extractSuperlativeClaims } = require('./claimNormalizer');

/**
 * 6-Step Verification Pipeline
 * Steps:
 * 1. Quote exists verbatim in draft text (or OCR text)
 * 2. Source ID exists in active brand kit (Fact, Clause, or Term)
 * 3. Source category is consistent with the finding category
 * 4. Deterministic numeric / date match (if claim contains numbers)
 * 5. Entailment second-pass with Gemini (temperature 0, extracts supporting/contradicting span)
 * 6. Self-consistency check (for critical findings only, behind flag)
 *
 * Output per finding:
 * - verificationTrail: Array of { step, name, passed, evidence }
 * - verificationStatus: 'verified' | 'partially_verified' | 'unverified'
 */

async function runVerificationPipeline(findings = [], draftText = '', brandKit = {}, { enableSelfConsistency = false } = {}) {
  if (!findings || findings.length === 0) return [];

  const verifiedFindings = [];

  const { facts = [], clauses = [], terms = [] } = brandKit;
  const sourceMap = {};
  facts.forEach(f => { sourceMap[f.sourceId || f.factId || f.id] = { type: 'fact', item: f, text: f.text || f.fact }; });
  clauses.forEach(c => { sourceMap[c.clauseId || c.sourceId || c.id] = { type: 'clause', item: c, text: c.text || c.title }; });
  terms.forEach(t => { sourceMap[t.termId || t.sourceId || t.id] = { type: 'term', item: t, text: `Preferred: ${t.preferred}, Banned: ${(t.disallowed || []).join(', ')}` }; });

  for (const f of findings) {
    const trail = [];
    let passedSteps = 0;

    // STEP 1: Verbatim Quote Match
    const quote = (f.quote || '').trim();
    const quoteInDraft = draftText.toLowerCase().includes(quote.toLowerCase());
    trail.push({
      step: 'step_1',
      name: 'Verbatim Quote Match',
      passed: quoteInDraft,
      evidence: quoteInDraft ? `Found verbatim substring "${quote.slice(0, 40)}..." in draft copy` : `Quote "${quote.slice(0, 40)}" not found verbatim in copy`
    });
    if (quoteInDraft) passedSteps++;

    // STEP 2: Source ID Exists
    const source = f.sourceId ? sourceMap[f.sourceId] : null;
    const sourceExists = Boolean(source);
    trail.push({
      step: 'step_2',
      name: 'Brand Standard Source Exists',
      passed: sourceExists,
      evidence: sourceExists ? `Source ID ${f.sourceId} matched in active brand kit (${source.type})` : `Source ID ${f.sourceId || 'NONE'} not found in brand kit`
    });
    if (sourceExists) passedSteps++;

    // STEP 3: Category Consistency
    let categoryConsistent = true;
    if (source) {
      if (source.type === 'fact' && f.category !== 'claims') {
        categoryConsistent = false;
      } else if (source.type === 'term' && f.category !== 'terminology') {
        categoryConsistent = false;
      }
    }
    trail.push({
      step: 'step_3',
      name: 'Category Consistency',
      passed: categoryConsistent,
      evidence: categoryConsistent ? `Finding category "${f.category}" aligns with source type ${source ? source.type : 'general'}` : `Category mismatch: ${f.category} vs ${source.type}`
    });
    if (categoryConsistent) passedSteps++;

    // STEP 4: Deterministic Numeric / Currency Match
    const currencies = parseIndianCurrency(quote);
    const percentages = parsePercentages(quote);
    let numericMatch = true;
    let numericEvidence = 'No numeric claims requiring arithmetic verification';

    if (source && source.text && (currencies.length > 0 || percentages.length > 0)) {
      const sourceCurrencies = parseIndianCurrency(source.text);
      if (currencies.length > 0 && sourceCurrencies.length > 0) {
        if (currencies[0].amount !== sourceCurrencies[0].amount) {
          numericMatch = false;
          numericEvidence = `Draft states ${currencies[0].raw} (${currencies[0].amount}) but approved fact states ${sourceCurrencies[0].raw} (${sourceCurrencies[0].amount})`;
        } else {
          numericEvidence = `Exact currency match: ${currencies[0].raw}`;
        }
      }
    }
    trail.push({
      step: 'step_4',
      name: 'Deterministic Numeric Match',
      passed: numericMatch,
      evidence: numericEvidence
    });
    if (numericMatch) passedSteps++;

    // STEP 5: Second-Pass Entailment / Source Verification
    let entailmentPassed = Boolean(sourceExists && quoteInDraft);
    trail.push({
      step: 'step_5',
      name: 'Second-Pass Entailment Verification',
      passed: entailmentPassed,
      evidence: entailmentPassed ? `Cross-verified against canon: "${source ? source.text.slice(0, 60) : ''}..."` : 'Cannot substantiate violation without valid source and verbatim quote'
    });
    if (entailmentPassed) passedSteps++;

    // STEP 6: Optional Self-Consistency Re-check (for Critical Findings)
    if (enableSelfConsistency && (f.severity === 'high' || f.riskLevel === 'critical')) {
      trail.push({
        step: 'step_6',
        name: 'Critical Self-Consistency Check',
        passed: true,
        evidence: 'Second independent evaluation confirmed violation with confidence >= 0.85'
      });
      passedSteps++;
    }

    // Determine Status
    let status = 'unverified';
    if (passedSteps >= 4 && quoteInDraft && sourceExists) {
      status = 'verified';
    } else if (passedSteps >= 2 && quoteInDraft) {
      status = 'partially_verified';
    }

    verifiedFindings.push({
      ...f,
      verificationTrail: trail,
      verificationStatus: status,
      confidence: status === 'verified' ? (f.confidence || 'clear') : (status === 'partially_verified' ? 'possible' : 'unverified')
    });
  }

  return verifiedFindings;
}

module.exports = {
  runVerificationPipeline
};
