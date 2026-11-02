import { describe, it, expect } from 'vitest';
import { calculateFindingRisk, calculateDraftRisk } from '../services/riskScorer';

describe('I1 Deterministic Brand Risk Scoring Engine', () => {
  it('assigns high risk score and critical level to factual claims with absolute wording on press release', () => {
    const finding = {
      category: 'claims',
      severity: 'high',
      confidence: 'clear',
      sourceType: 'fact',
      sourceId: 'F-03',
      quote: 'India’s only 100% organic single-origin coffee with guaranteed zero acidity',
      reason: 'Violates F-03: Brewline does not make absolute health claims.'
    };

    const risk = calculateFindingRisk(finding, 'press_release');

    // Base 40 + High 15 + Clear 10 + Regulated (100%, guaranteed, only) ~20 = 85 * 1.4 = 119 -> clamped 100
    expect(risk.riskScore).toBe(100);
    expect(risk.riskLevel).toBe('critical');
    expect(risk.riskDrivers.length).toBeGreaterThan(3);
    expect(risk.riskDrivers.some(d => d.includes('Press_release') || d.includes('Channel reach'))).toBe(true);
  });

  it('assigns low risk score to minor tone issue on internal channel', () => {
    const finding = {
      category: 'tone',
      severity: 'low',
      confidence: 'unverified',
      sourceType: 'clause',
      sourceId: 'G-01',
      quote: 'Hey folks grab a cup',
      reason: 'Slightly informal for brand tone'
    };

    const risk = calculateFindingRisk(finding, 'internal');

    // Base 20 - Low 10 - Unverified 15 = 0 * 0.7 = 0
    expect(risk.riskScore).toBeLessThan(20);
    expect(risk.riskLevel).toBe('low');
  });

  it('calculates aggregated draft risk correctly', () => {
    const findings = [
      { status: 'open', riskScore: 85, riskLevel: 'critical', severity: 'high' },
      { status: 'open', riskScore: 45, riskLevel: 'medium', severity: 'medium' },
      { status: 'accepted', riskScore: 90, riskLevel: 'critical', severity: 'high' } // Resolved shouldn't count
    ];

    const draftRisk = calculateDraftRisk(findings, 'social');

    expect(draftRisk.criticalCount).toBe(1);
    expect(draftRisk.mediumCount).toBe(1);
    expect(draftRisk.riskLevel).toBe('critical');
    expect(draftRisk.riskScore).toBeGreaterThanOrEqual(85);
  });
});
