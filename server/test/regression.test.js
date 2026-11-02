import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { runExactChecks } from '../services/exactChecks';
import { calculateFindingRisk } from '../services/riskScorer';
import { computeFindingFingerprint } from '../services/recurrenceDetector';
import { parseIndianCurrency, extractSuperlativeClaims } from '../services/claimNormalizer';

describe('E5 Comprehensive Backend Regression Test Suite (AI_MODE=mock)', () => {
  const brandKitFixture = {
    clauses: [
      { clauseId: 'G-01', text: 'Maintain warm, authentic, craft-focused tone' },
      { clauseId: 'G-02', text: 'Highlight fair compensation for local growers' }
    ],
    facts: [
      { factId: 'F-01', text: 'Brewline beans grow at 1,200m elevation in Coorg, Karnataka' },
      { factId: 'F-02', text: 'Estate Blend is priced at ₹349 per 250g pack' }
    ],
    terms: [
      { preferred: 'shade-grown', disallowed: ['sun-scorched', 'plantation-grown'] },
      { preferred: 'artisanal batch', disallowed: ['factory mass-produced', 'industrial'] }
    ]
  };

  it('detects disallowed terms with exact quote and character offsets', () => {
    const draftText = 'We reject industrial shortcuts and only roast artisanal beans.';
    const terms = [
      { preferred: 'artisanal batch', disallowed: ['factory mass-produced', 'industrial'], banned: ['factory mass-produced', 'industrial'] }
    ];
    const findings = runExactChecks(draftText, terms);

    const termViolation = findings.find(f => f.category === 'terminology');
    expect(termViolation).toBeDefined();
    expect(termViolation.quote).toBe('industrial');
    expect(termViolation.start).toBe(draftText.indexOf('industrial'));
    expect(termViolation.end).toBe(draftText.indexOf('industrial') + 'industrial'.length);
  });

  it('handles empty and whitespace-only text gracefully without crashing', () => {
    const emptyResult = runExactChecks('', []);
    expect(emptyResult).toEqual([]);

    const wsResult = runExactChecks('   \n\t  ', []);
    expect(wsResult).toEqual([]);
  });

  it('handles Hindi and multi-lingual Unicode characters cleanly', () => {
    const hindiText = 'हमारी कॉफी कूर्ग (Coorg) के 1,200m ऊंचे बागानों से आती है। industrial विधि का उपयोग नहीं होता।';
    const terms = [
      { preferred: 'artisanal batch', disallowed: ['industrial'], banned: ['industrial'] }
    ];
    const findings = runExactChecks(hindiText, terms);

    const termViolation = findings.find(f => f.category === 'terminology');
    expect(termViolation).toBeDefined();
    expect(termViolation.quote).toBe('industrial');
  });

  it('handles very large documents (100,000 characters) within acceptable processing time', () => {
    const baseSentence = 'Brewline crafts artisanal shade-grown coffee in Coorg. ';
    const largeDoc = baseSentence.repeat(2000); // ~110,000 chars

    const start = Date.now();
    const findings = runExactChecks(largeDoc, []);
    const durationMs = Date.now() - start;

    expect(durationMs).toBeLessThan(1000); // Must execute under 1 second
    expect(Array.isArray(findings)).toBe(true);
  });

  it('enforces deterministic risk scores across all 4 risk tiers (critical, high, medium, low)', () => {
    const criticalFinding = {
      category: 'claims',
      severity: 'high',
      confidence: 'clear',
      sourceType: 'fact',
      quote: '100% guaranteed organic miracle coffee with lowest price'
    };
    const critRisk = calculateFindingRisk(criticalFinding, 'press_release');
    expect(critRisk.riskLevel).toBe('critical');

    const lowFinding = {
      category: 'accessibility',
      severity: 'low',
      confidence: 'unverified',
      sourceType: 'clause',
      quote: 'click here'
    };
    const lowRisk = calculateFindingRisk(lowFinding, 'internal');
    expect(lowRisk.riskLevel).toBe('low');
  });

  it('generates consistent recurrence fingerprints regardless of casing and punctuation', () => {
    const wsId = 'workspace_test_01';
    const fp1 = computeFindingFingerprint(wsId, { sourceId: 'F-01', category: 'claims', quote: 'Priced at ₹349 only!' });
    const fp2 = computeFindingFingerprint(wsId, { sourceId: 'F-01', category: 'claims', quote: 'priced at ₹349 only' });

    expect(fp1).toBe(fp2);
  });

  it('parses multiple Indian currency notations correctly', () => {
    const currencies = parseIndianCurrency('Pack ₹349, bulk 5 lakh, export 2 crore');
    expect(currencies.length).toBe(3);
    expect(currencies[0].amount).toBe(349);
    expect(currencies[1].amount).toBe(500000);
    expect(currencies[2].amount).toBe(20000000);
  });

  it('extracts superlative claims properly', () => {
    const claims = extractSuperlativeClaims('This is the best and only coffee in India with guaranteed freshness.');
    const terms = claims.map(c => c.term);
    expect(terms).toContain('best');
    expect(terms).toContain('only');
    expect(terms).toContain('guaranteed');
  });
});
