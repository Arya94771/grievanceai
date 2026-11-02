import { describe, it, expect } from 'vitest';
import {
  normalizeQuote,
  computeFindingFingerprint
} from '../services/recurrenceDetector';

describe('I3 Recurrence Detection & Guideline Clarity Analysis', () => {
  it('normalizes quote removing punctuation, case, and extra whitespace', () => {
    const q1 = '  "India\'s ONLY 100% Organic Single-Origin Coffee!"  ';
    const q2 = 'indias only 100 organic singleorigin coffee';
    expect(normalizeQuote(q1)).toBe(q2);
  });

  it('produces identical fingerprints for semantically identical findings across drafts', () => {
    const wsId = 'ws_1234567890';
    const findingA = {
      sourceId: 'F-03',
      category: 'claims',
      quote: '100% organic beans guaranteed.'
    };
    const findingB = {
      sourceId: 'F-03',
      category: 'claims',
      quote: '  "100% organic beans guaranteed!" '
    };

    const fpA = computeFindingFingerprint(wsId, findingA);
    const fpB = computeFindingFingerprint(wsId, findingB);

    expect(fpA).toBe(fpB);
    expect(fpA.length).toBe(32);
  });

  it('produces different fingerprints for different rules or quotes', () => {
    const wsId = 'ws_1234567890';
    const fp1 = computeFindingFingerprint(wsId, { sourceId: 'F-01', category: 'claims', quote: 'Brewed at 1500m' });
    const fp2 = computeFindingFingerprint(wsId, { sourceId: 'F-02', category: 'claims', quote: 'Brewed at 1500m' });
    expect(fp1).not.toBe(fp2);
  });
});
