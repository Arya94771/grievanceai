import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  rgbToHex,
  hexToLab,
  deltaE2000,
  extractDominantColors,
  runDeterministicVisualChecks
} from '../services/visualChecks';

describe('Deterministic Visual Checks & Color Science (V3)', () => {
  it('converts identical colors with deltaE = 0', () => {
    const lab1 = hexToLab('#1B4332');
    const lab2 = hexToLab('#1B4332');
    const dE = deltaE2000(lab1, lab2);
    expect(dE).toBeCloseTo(0, 2);
  });

  it('measures noticeable color distance accurately with CIEDE2000', () => {
    // Forest green vs bright crimson red
    const forestLab = hexToLab('#1B4332');
    const crimsonLab = hexToLab('#E63946');
    const dE = deltaE2000(forestLab, crimsonLab);

    // Highly distinct colors should have deltaE > 40
    expect(dE).toBeGreaterThan(40);
  });

  it('extracts dominant color from solid color image fixture with > 90% coverage', async () => {
    // Create 100x100 solid forest green PNG
    const solidGreenBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 27, g: 67, b: 50 } // #1B4332
      }
    }).png().toBuffer();

    const dominant = await extractDominantColors(solidGreenBuffer);
    expect(dominant.length).toBeGreaterThan(0);
    expect(dominant[0].coveragePercent).toBeGreaterThan(95);
    expect(dominant[0].hex).toBe('#1B4332');
  });

  it('flags low resolution image when dimensions are below threshold', async () => {
    const tinyBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: '#1B4332'
      }
    }).png().toBuffer();

    const result = await runDeterministicVisualChecks(tinyBuffer, {
      approvedPalettes: [],
      minDimension: 600
    });

    const resFinding = result.findings.find(f => f.reason.includes('below minimum recommended'));
    expect(resFinding).toBeDefined();
    expect(resFinding.severity).toBe('medium');
    expect(resFinding.measured.width).toBe(400);
  });

  it('flags off-palette dominant colors with CIEDE2000 distance and coverage percent', async () => {
    // Creative with bright pink/red background
    const redCreativeBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 3,
        background: { r: 230, g: 57, b: 70 } // #E63946
      }
    }).png().toBuffer();

    const approvedPalettes = [
      {
        name: 'Brewline Corporate Palette',
        palette: [
          { hex: '#1B4332', name: 'Forest Green', tolerance: 12 },
          { hex: '#D4A373', name: 'Roast Amber', tolerance: 12 }
        ]
      }
    ];

    const result = await runDeterministicVisualChecks(redCreativeBuffer, {
      approvedPalettes,
      minDimension: 600
    });

    const paletteFinding = result.findings.find(f => f.quote.includes('Off-palette color'));
    expect(paletteFinding).toBeDefined();
    expect(paletteFinding.confidence).toBe('clear');
    expect(paletteFinding.measured.deltaE).toBeGreaterThan(12);
    expect(paletteFinding.measured.nearestHex).toBeDefined();
  });
});
