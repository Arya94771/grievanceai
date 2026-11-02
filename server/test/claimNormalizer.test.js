import { describe, it, expect } from 'vitest';
import {
  parseIndianCurrency,
  parsePercentages,
  extractSuperlativeClaims,
  compareNumericClaim
} from '../services/claimNormalizer';

describe('E2 Claim Normalizer for Indian Copy', () => {
  it('correctly parses Indian currency formats (lakh, crore, INR, ₹, commas)', () => {
    const text = 'Starting at ₹1,20,000 for retail kits or Rs. 2.5 lakh for enterprise. Total INR 1 crore investment.';
    const currencies = parseIndianCurrency(text);

    expect(currencies.length).toBe(3);
    expect(currencies[0].amount).toBe(120000);
    expect(currencies[1].amount).toBe(250000);
    expect(currencies[2].amount).toBe(10000000);
  });

  it('parses percentage values accurately', () => {
    const text = 'Made with 100% Arabica beans and 0% Robusta fillers.';
    const p = parsePercentages(text);

    expect(p.length).toBe(2);
    expect(p[0].percent).toBe(100);
    expect(p[1].percent).toBe(0);
  });

  it('detects banned absolute and superlative terms', () => {
    const text = 'India’s only guaranteed cure for morning fatigue with lowest price.';
    const claims = extractSuperlativeClaims(text);

    const terms = claims.map(c => c.term);
    expect(terms).toContain('only');
    expect(terms).toContain('guaranteed');
    expect(terms).toContain('cure');
    expect(terms).toContain('lowest price');
  });

  it('compares numeric claims strictly with zero tolerance', () => {
    const match = compareNumericClaim(349, 349);
    expect(match.matches).toBe(true);

    const mismatch = compareNumericClaim(199, 349);
    expect(mismatch.matches).toBe(false);
    expect(mismatch.diff).toBe(150);
  });
});
