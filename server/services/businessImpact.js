const { generateGeminiContent, isMockMode } = require('./geminiClient');

/**
 * Generates a one-line business impact statement tagged:
 * legal | reputational | financial | accessibility | brand-consistency
 * Uses Gemini constrained to riskDrivers at temperature 0, with template fallback.
 * Strictly never fabricates statistics or monetary estimates.
 */

const FALLBACK_TEMPLATES = {
  claims: {
    tag: 'legal',
    impact: 'Exposes brand to regulatory scrutiny and false advertising challenges.'
  },
  terminology: {
    tag: 'brand-consistency',
    impact: 'Dilutes artisanal brand positioning and contradicts core identity guidelines.'
  },
  tone: {
    tag: 'reputational',
    impact: 'Compromises premium brand voice and risks eroding customer trust.'
  },
  accessibility: {
    tag: 'accessibility',
    impact: 'Excludes audience segments with visual impairments and violates digital accessibility standards.'
  },
  logo_misuse: {
    tag: 'brand-consistency',
    impact: 'Violates trademark visual identity guidelines and weakens brand recognition.'
  },
  off_palette: {
    tag: 'brand-consistency',
    impact: 'Subverts approved chromatic identity standards across marketing channels.'
  }
};

async function generateBusinessImpact(finding, riskDrivers = []) {
  const cat = (finding.category || 'claims').toLowerCase().replace(/[-\s]/g, '_');
  const fallback = FALLBACK_TEMPLATES[cat] || {
    tag: 'brand-consistency',
    impact: 'Conflicts with published brand governance rules and consistency standards.'
  };

  // If in mock mode or AI unavailable, use template immediately
  if (isMockMode()) {
    return {
      businessImpact: fallback.impact,
      impactTag: fallback.tag
    };
  }

  try {
    const prompt = `
Generate a single-sentence business impact statement for this brand governance finding.
Finding: "${finding.quote}"
Category: ${finding.category}
Reason: ${finding.reason}
Risk Drivers: ${riskDrivers.join('; ')}

Rules:
1. Return JSON with format: {"impactTag": "legal"|"reputational"|"financial"|"accessibility"|"brand-consistency", "businessImpact": "One clear concise sentence"}
2. Do NOT fabricate financial numbers, fine amounts, percentages, or statistics.
3. Be objective, realistic, and legally sound.
`;

    const res = await generateGeminiContent({
      prompt,
      systemInstruction: 'You are an enterprise brand risk counsel. Output only valid JSON.'
    });

    const parsed = res.parsed || JSON.parse(res.text);
    return {
      businessImpact: parsed.businessImpact || fallback.impact,
      impactTag: parsed.impactTag || fallback.tag
    };
  } catch (err) {
    return {
      businessImpact: fallback.impact,
      impactTag: fallback.tag
    };
  }
}

module.exports = {
  generateBusinessImpact,
  FALLBACK_TEMPLATES
};
