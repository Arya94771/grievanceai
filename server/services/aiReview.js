const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AiUseLog } = require('../models');
const { runExactChecks } = require('./exactChecks');

/**
 * Concurrency limiter to prevent free-tier 429 rate limit tripping
 */
let activeAiCalls = 0;
const aiCallQueue = [];

function acquireAiLock() {
  return new Promise((resolve) => {
    if (activeAiCalls < 1) {
      activeAiCalls++;
      resolve();
    } else {
      aiCallQueue.push(resolve);
    }
  });
}

function releaseAiLock() {
  activeAiCalls--;
  if (aiCallQueue.length > 0) {
    const next = aiCallQueue.shift();
    activeAiCalls++;
    next();
  }
}

/**
 * Computes deterministic hash of draft content + intent + brand kit version
 */
function computeReviewHash(content, intent = '', brandKitVersion = 1) {
  return crypto
    .createHash('sha256')
    .update(`${(content || '').trim()}::${(intent || '').trim()}::${brandKitVersion}`)
    .digest('hex');
}

/**
 * Redacts personal identifiers (emails and phone numbers) from text
 */
function redactPII(text) {
  if (!text) return { redactedText: '', redactions: [] };

  const redactions = [];
  let redactedText = text;

  // Redact Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let emailCount = 0;
  redactedText = redactedText.replace(emailRegex, (match) => {
    emailCount++;
    const token = `[REDACTED_EMAIL_${emailCount}]`;
    redactions.push(`Email redacted: ${match} -> ${token}`);
    return token;
  });

  // Redact Phone Numbers (international, Indian, standard 10-digit formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  let phoneCount = 0;
  redactedText = redactedText.replace(phoneRegex, (match) => {
    // Only redact if string contains at least 7 digits (avoid matching single numbers/years)
    const digitCount = (match.match(/\d/g) || []).length;
    if (digitCount >= 7 && digitCount <= 13) {
      phoneCount++;
      const token = `[REDACTED_PHONE_${phoneCount}]`;
      redactions.push(`Phone number redacted: ${match} -> ${token}`);
      return token;
    }
    return match;
  });

  return { redactedText, redactions };
}

/**
 * Normalizes whitespace in string for resilient verbatim quote matching
 */
function normalizeWhitespace(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

/**
 * Server-Side Verifier: Computes verbatim offsets and validates source attribution
 */
function verifyAndLocateQuote(rawQuote, originalText, kitMap) {
  if (!rawQuote || !originalText) return null;

  const cleanQuote = rawQuote.trim();
  if (!cleanQuote) return null;

  // 1. Direct exact search
  let start = originalText.indexOf(cleanQuote);
  let end = -1;

  if (start !== -1) {
    end = start + cleanQuote.length;
    return {
      quote: cleanQuote,
      start,
      end,
      exact: true
    };
  }

  // 2. Case-insensitive exact search
  const lowerOriginal = originalText.toLowerCase();
  const lowerQuote = cleanQuote.toLowerCase();
  start = lowerOriginal.indexOf(lowerQuote);
  if (start !== -1) {
    end = start + cleanQuote.length;
    const actualQuote = originalText.substring(start, end);
    return {
      quote: actualQuote,
      start,
      end,
      exact: true
    };
  }

  // 3. Whitespace-normalised search
  const normOriginal = normalizeWhitespace(originalText);
  const normQuote = normalizeWhitespace(cleanQuote);
  const normIndex = normOriginal.indexOf(normQuote);

  if (normIndex !== -1) {
    // Locate original boundary by sliding window or regex matching words
    const quoteWords = normQuote.split(' ');
    if (quoteWords.length > 0) {
      const firstWord = quoteWords[0];
      const lastWord = quoteWords[quoteWords.length - 1];
      const firstIdx = originalText.indexOf(firstWord);
      if (firstIdx !== -1) {
        const afterFirst = originalText.substring(firstIdx);
        const lastIdx = afterFirst.indexOf(lastWord);
        if (lastIdx !== -1) {
          const matchedSubstring = afterFirst.substring(0, lastIdx + lastWord.length);
          return {
            quote: matchedSubstring,
            start: firstIdx,
            end: firstIdx + matchedSubstring.length,
            exact: false
          };
        }
      }
    }
  }

  return null;
}

/**
 * Merges exact deterministic checks and AI findings, de-duplicating overlapping spans
 */
function mergeAndDeduplicate(exactFindings, aiFindings) {
  const merged = [...exactFindings];

  for (const aiFinding of aiFindings) {
    // Check if any existing finding already covers this exact span with same category
    const overlap = merged.some(existing => {
      const spansOverlap = (aiFinding.start < existing.end && aiFinding.end > existing.start);
      return spansOverlap && (
        existing.category === aiFinding.category ||
        (existing.sourceType === 'term' && aiFinding.category === 'terminology') ||
        (existing.sourceType === 'rule' && existing.sourceId === 'RULE-LINK-TEXT' && aiFinding.category === 'accessibility')
      );
    });

    if (!overlap) {
      merged.push(aiFinding);
    }
  }

  // Sort by starting character offset
  return merged.sort((a, b) => a.start - b.start);
}

/**
 * Main AI Review Runner
 */
async function runFullReview({
  draftContent,
  draftIntent = '',
  clauses = [],
  facts = [],
  terms = [],
  workspaceId = null,
  draftId = null
}) {
  // 1. Run exact deterministic rule checks first (Always succeeds)
  const exactFindings = runExactChecks(draftContent, terms);

  // 2. Check Gemini configuration
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      findings: exactFindings,
      aiUsed: false,
      note: 'AI review unavailable (missing API key), showing rule checks only.'
    };
  }

  // 3. Redact PII (emails and phone numbers)
  const { redactedText, redactions } = redactPII(draftContent);

  // 4. Build Brand Kit lookups for server-side verification
  const kitMap = {
    clauses: new Map(clauses.map(c => [c.clauseId, c])),
    facts: new Map(facts.map(f => [f.factId, f])),
    terms: new Map(terms.map(t => [t.preferred.toLowerCase(), t]))
  };

  // Prepare concise context for Gemini
  const clausesContext = clauses.map(c => `[${c.clauseId}] (${c.category}, severity:${c.severity}) ${c.text}`).join('\n');
  const factsContext = facts.map(f => `[${f.factId}] ${f.statement}`).join('\n');
  const termsContext = terms.map(t => `Preferred: "${t.preferred}" | Banned: [${t.banned.join(', ')}]`).join('\n');

  const systemInstruction = `You are GrievanceAI, an expert brand governance auditor.
Your job is to audit content against an organization's approved guidelines, terminology, and approved facts.

BRAND CLAUSES:
${clausesContext}

APPROVED FACTS:
${factsContext}

BRAND TERMINOLOGY:
${termsContext}

AUTHOR'S STATED INTENT:
"${draftIntent || 'Not specified'}"

AUDIT RULES:
1. Identify all violations of brand guidelines (tone, terminology, messaging, accessibility, claims, visual).
2. For CLAIMS:
   - Extract factual claims (numbers, prices, dates, altitudes, certifications, health effects, superlatives like "best coffee in India").
   - Classify each claim:
     - If it matches an approved fact: it is supported (do NOT flag).
     - If it directly contradicts an approved fact (e.g. wrong price, wrong tour date, wrong caffeine amount): flag as category "claims", severity "high", cite the fact ID (e.g. "F-02").
     - If it makes an unverified claim, health benefit, or superlative without a matching fact in the kit: flag as category "claims", severity "high", reason must state "unsupported claim" (NEVER say "false"), and suggest a modest, defensible alternative.
3. Every suggestion must be a MINIMAL surgical replacement that preserves the creator's stated intent.
4. Return ONLY a valid JSON array matching this exact schema:
[
  {
    "quote": "verbatim string from draft",
    "category": "tone" | "terminology" | "messaging" | "accessibility" | "claims" | "visual",
    "severity": "high" | "medium" | "low",
    "sourceId": "clause or fact ID like G-01 or F-02 (leave empty if general rule)",
    "reason": "Clear explanation of the violation and why it violates the cited standard",
    "suggestion": "Minimal surgical fix preserving intent"
  }
]`;

  let aiRawFindings = [];
  let callSucceeded = false;
  let fallbackNote = null;
  let activeModelUsed = modelName;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `DRAFT CONTENT TO AUDIT:\n"""\n${redactedText}\n"""\n\nPerform a thorough brand compliance review. Return JSON array.`;

    const candidateModels = [modelName, 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
    let lastError = null;

    for (const candidate of candidateModels) {
      if (callSucceeded) break;
      for (let attempt = 0; attempt < 2; attempt++) {
        await acquireAiLock();
        try {
          const model = genAI.getGenerativeModel({
            model: candidate,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          });

          const result = await model.generateContent([
            { text: systemInstruction },
            { text: prompt }
          ]);

          const responseText = result.response.text();
          aiRawFindings = JSON.parse(responseText);
          callSucceeded = true;
          activeModelUsed = candidate;
          releaseAiLock();
          break;
        } catch (err) {
          releaseAiLock();
          lastError = err;
          // Exponential backoff: 1000ms, then 2000ms
          const backoffDelay = (attempt + 1) * 1000;
          await new Promise(r => setTimeout(r, backoffDelay));
        }
      }
    }

    if (callSucceeded) {
      // Log AI call in AiUseLog
      await AiUseLog.create({
        workspaceId,
        draftId,
        model: activeModelUsed,
        whatWasSent: `Draft length: ${draftContent.length} chars. Stated intent: "${draftIntent}". Clauses: ${clauses.length}, Facts: ${facts.length}, Terms: ${terms.length}`,
        redactionsApplied: redactions,
        timestamp: new Date()
      }).catch(err => console.error('[AiUseLog Save Error]:', err.message));
    } else {
      throw lastError || new Error('All model candidates failed');
    }

  } catch (err) {
    console.error('[Gemini AI Review Error]:', err.message || err);
    fallbackNote = `AI review unavailable (${err.message.includes('429') ? 'Rate limit exceeded' : 'Service notice'}), showing rule checks only.`;
  }

  // 5. SERVER-SIDE VERIFICATION OF AI FINDINGS (Mandatory)
  const verifiedAiFindings = [];

  if (callSucceeded && Array.isArray(aiRawFindings)) {
    for (const raw of aiRawFindings) {
      if (!raw.quote) continue;

      // Verbatim location verification
      const location = verifyAndLocateQuote(raw.quote, draftContent, kitMap);
      if (!location) {
        // Quote did not exist verbatim in draft -> drop
        continue;
      }

      // Source verification
      let sourceType = 'rule';
      let sourceText = '';
      let confidence = 'possible';
      let verifiedSourceId = (raw.sourceId || '').trim();

      if (verifiedSourceId) {
        if (kitMap.clauses.has(verifiedSourceId)) {
          sourceType = 'clause';
          sourceText = kitMap.clauses.get(verifiedSourceId).text;
          confidence = 'clear';
        } else if (kitMap.facts.has(verifiedSourceId)) {
          sourceType = 'fact';
          sourceText = kitMap.facts.get(verifiedSourceId).statement;
          confidence = 'clear';
        } else {
          // Model invented an unknown sourceId -> downgrade
          verifiedSourceId = '';
          confidence = 'unverified';
        }
      } else {
        confidence = 'possible';
      }

      verifiedAiFindings.push({
        quote: location.quote,
        start: location.start,
        end: location.end,
        category: raw.category || 'messaging',
        severity: raw.severity || 'medium',
        confidence,
        sourceType,
        sourceId: verifiedSourceId,
        sourceText,
        reason: raw.reason || 'Flagged by brand compliance review',
        suggestion: raw.suggestion || '',
        status: 'open'
      });
    }
  }

  // 6. Merge exact findings and verified AI findings, de-duplicating overlapping spans
  const combinedFindings = mergeAndDeduplicate(exactFindings, verifiedAiFindings);

  return {
    findings: combinedFindings,
    aiUsed: callSucceeded,
    totalFindings: combinedFindings.length,
    note: fallbackNote
  };
}

module.exports = {
  redactPII,
  verifyAndLocateQuote,
  mergeAndDeduplicate,
  computeReviewHash,
  runFullReview
};
