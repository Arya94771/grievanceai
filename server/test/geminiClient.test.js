import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateGeminiContent,
  setMockMode,
  setCustomMockResponse,
  resetMock,
  isMockMode
} from '../services/geminiClient';
import { runFullReview } from '../services/aiReview';
import { clauses, facts, terms, sampleDrafts } from '../seed/seedData';

describe('Gemini Client & AI Mock Mode (E1)', () => {
  beforeEach(() => {
    resetMock();
    process.env.AI_MODE = 'mock';
  });

  afterEach(() => {
    resetMock();
    delete process.env.AI_MODE;
  });

  it('detects mock mode correctly', () => {
    expect(isMockMode()).toBe(true);
    setMockMode('valid');
    expect(isMockMode()).toBe(true);
  });

  it('serves recorded fixtures for text reviews in mock mode', async () => {
    const res = await generateGeminiContent({
      prompt: 'DRAFT CONTENT TO AUDIT:\nMonsoon Roast Social Announcement\n'
    });

    expect(res.mock).toBe(true);
    expect(res.aiUsed).toBe(true);
    expect(Array.isArray(res.parsed)).toBe(true);
    expect(res.parsed.length).toBeGreaterThan(0);
    expect(res.parsed[0]).toHaveProperty('quote');
    expect(res.parsed[0]).toHaveProperty('category');
  });

  it('serves second-pass evaluation fixture', async () => {
    const res = await generateGeminiContent({
      prompt: 'SECOND PASS EVALUATION RULES:\nDoes the cited source actually support...'
    });

    expect(res.mock).toBe(true);
    expect(Array.isArray(res.parsed)).toBe(true);
    expect(res.parsed[0]).toHaveProperty('supports');
  });

  it('serves vision review fixture when parts are provided', async () => {
    const res = await generateGeminiContent({
      prompt: 'Audit image creative against approved logo',
      parts: [{ inlineData: { mimeType: 'image/png', data: 'fake_base64' } }]
    });

    expect(res.mock).toBe(true);
    expect(res.parsed).toHaveProperty('logoPresent');
    expect(res.parsed).toHaveProperty('matchesApproved');
  });

  it('handles injected malformed JSON mode gracefully', async () => {
    setMockMode('malformed_json');
    const res = await generateGeminiContent({ prompt: 'test' });
    expect(res.mock).toBe(true);
    expect(() => JSON.parse(res.text)).toThrow();
  });

  it('handles injected timeout mode gracefully', async () => {
    setMockMode('timeout');
    await expect(generateGeminiContent({ prompt: 'test', timeoutMs: 100 })).rejects.toThrow(/timed out/i);
  });

  it('handles injected 429 rate limit mode gracefully', async () => {
    setMockMode('rate_limit_429');
    await expect(generateGeminiContent({ prompt: 'test' })).rejects.toThrow(/429/i);
  });

  it('supports custom injected mock responses for test assertions', async () => {
    const customFindings = [{ quote: 'custom text', category: 'tone', severity: 'low' }];
    setCustomMockResponse(customFindings);

    const res = await generateGeminiContent({ prompt: 'anything' });
    expect(res.parsed).toEqual(customFindings);
  });

  it('executes runFullReview end-to-end in AI_MODE=mock without network calls', async () => {
    process.env.AI_MODE = 'mock';
    const draft = sampleDrafts[0];

    const result = await runFullReview({
      draftContent: draft.content,
      draftIntent: draft.intent,
      clauses,
      facts,
      terms
    });

    expect(result.aiUsed).toBe(true);
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
    // Verifies quotes actually exist in draft
    result.findings.forEach(f => {
      expect(draft.content).toContain(f.quote);
      expect(f.start).toBeGreaterThanOrEqual(0);
      expect(f.end).toBeGreaterThan(f.start);
    });
  });
});
