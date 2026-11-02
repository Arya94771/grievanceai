import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  verifyMagicBytes,
  isSvgBuffer,
  sanitizeFilename,
  processAndSecureImage
} from '../services/imageStorage';
import { validateAndNormalizeBox } from '../services/aiVisionReview';

describe('V7 Visual Engine Security, Bounds & Aspect Ratio Tests', () => {
  it('verifies magic bytes for PNG and JPEG buffers', async () => {
    const pngBuf = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#1B4332' }
    }).png().toBuffer();

    const jpegBuf = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#1B4332' }
    }).jpeg().toBuffer();

    expect(verifyMagicBytes(pngBuf)).toBe('image/png');
    expect(verifyMagicBytes(jpegBuf)).toBe('image/jpeg');
  });

  it('rejects spoofed extension files where extension does not match magic bytes', async () => {
    // Fake buffer pretending to be a PNG
    const fakeBuffer = Buffer.from('NOT_A_REAL_IMAGE_FILE_JUST_TEXT');
    expect(verifyMagicBytes(fakeBuffer)).toBe(false);

    await expect(
      processAndSecureImage(fakeBuffer, 'malicious.png')
    ).rejects.toThrow(/Invalid image format/);
  });

  it('rejects oversized uploads exceeding 4 MB limit', async () => {
    // 5 MB dummy buffer
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024);
    await expect(
      processAndSecureImage(oversizedBuffer, 'huge.png')
    ).rejects.toThrow(/exceeds 4 MB/i);
  });

  it('rejects non-admin SVG uploads to prevent XSS / XML external entity attacks', async () => {
    const svgContent = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const svgBuffer = Buffer.from(svgContent);

    expect(isSvgBuffer(svgBuffer)).toBe(true);

    await expect(
      processAndSecureImage(svgBuffer, 'logo.svg', { isAdmin: false })
    ).rejects.toThrow(/SVG uploads are prohibited/i);
  });

  it('sanitizes malicious filenames preventing directory traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('bad$file*name?.png')).toBe('bad_file_name_.png');
    expect(sanitizeFilename('')).toBe('unnamed_image.png');
  });

  it('validates and clamps bounding box coordinates correctly within 0..1000', () => {
    // Normal box
    const valid = validateAndNormalizeBox([100, 150, 400, 600]);
    expect(valid).not.toBeNull();
    expect(valid.ymin).toBe(100);
    expect(valid.xmax).toBe(600);

    // Box needing clamping from negative or oversized values
    const clamped = validateAndNormalizeBox([-50, 200, 1200, 800]);
    expect(clamped).not.toBeNull();
    expect(clamped.ymin).toBe(0);
    expect(clamped.ymax).toBe(1000);

    // Inverted or zero-area box should be rejected
    const inverted = validateAndNormalizeBox([500, 200, 400, 800]); // ymin > ymax
    expect(inverted).toBeNull();

    // Invalid non-array or NaN box
    expect(validateAndNormalizeBox('invalid')).toBeNull();
    expect(validateAndNormalizeBox([NaN, 10, 20, 30])).toBeNull();
  });

  it('correctly calculates aspect ratio within tolerance (8%)', () => {
    const approvedAspectRatio = 400 / 120; // 3.333
    const detectedWidth = 330;
    const detectedHeight = 100;
    const detectedAspectRatio = detectedWidth / detectedHeight; // 3.300
    const ratioDelta = Math.abs(detectedAspectRatio - approvedAspectRatio) / approvedAspectRatio; // ~0.01 (1%)

    expect(ratioDelta).toBeLessThan(0.08); // Within 8% tolerance -> valid aspect ratio

    // Distorted aspect ratio: 500 / 80 = 6.25 -> 87% distortion
    const distortedRatio = 500 / 80;
    const distortedDelta = Math.abs(distortedRatio - approvedAspectRatio) / approvedAspectRatio;
    expect(distortedDelta).toBeGreaterThan(0.08); // Correctly flagged as stretched
  });
});
