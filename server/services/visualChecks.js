const sharp = require('sharp');

/**
 * Converts sRGB [0..255] to CIE XYZ (D65 standard illuminant)
 */
function rgbToXyz(r, g, b) {
  let sR = r / 255;
  let sG = g / 255;
  let sB = b / 255;

  sR = sR > 0.04045 ? Math.pow((sR + 0.055) / 1.055, 2.4) : sR / 12.92;
  sG = sG > 0.04045 ? Math.pow((sG + 0.055) / 1.055, 2.4) : sG / 12.92;
  sB = sB > 0.04045 ? Math.pow((sB + 0.055) / 1.055, 2.4) : sB / 12.92;

  sR *= 100;
  sG *= 100;
  sB *= 100;

  // Observer = 2°, Illuminant = D65
  const x = sR * 0.4124 + sG * 0.3576 + sB * 0.1805;
  const y = sR * 0.2126 + sG * 0.7152 + sB * 0.0722;
  const z = sR * 0.0193 + sG * 0.1192 + sB * 0.9505;

  return { x, y, z };
}

/**
 * Converts CIE XYZ to CIE L*a*b*
 */
function xyzToLab(x, y, z) {
  // D65 reference white points
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let varX = x / refX;
  let varY = y / refY;
  let varZ = z / refZ;

  varX = varX > 0.008856 ? Math.pow(varX, 1 / 3) : (7.787 * varX) + (16 / 116);
  varY = varY > 0.008856 ? Math.pow(varY, 1 / 3) : (7.787 * varY) + (16 / 116);
  varZ = varZ > 0.008856 ? Math.pow(varZ, 1 / 3) : (7.787 * varZ) + (16 / 116);

  const l = (116 * varY) - 16;
  const a = 500 * (varX - varY);
  const b = 200 * (varY - varZ);

  return { l, a, b };
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '').trim();
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function hexToLab(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * CIEDE2000 Color Difference Formula (Standard CIE metric)
 */
function deltaE2000(lab1, lab2) {
  const degToRad = Math.PI / 180;
  const radToDeg = 180 / Math.PI;

  const L1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;

  const L2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));

  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  let h1Prime = radToDeg * Math.atan2(b1, a1Prime);
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = radToDeg * Math.atan2(b2, a2Prime);
  if (h2Prime < 0) h2Prime += 360;

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltahPrime = 0;
  if (C1Prime * C2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltahPrime = diff;
    } else if (diff > 180) {
      deltahPrime = diff - 360;
    } else {
      deltahPrime = diff + 360;
    }
  }

  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltahPrime * degToRad) / 2);

  const LbarPrime = (L1 + L2) / 2;
  const CbarPrime = (C1Prime + C2Prime) / 2;

  let hbarPrime = (h1Prime + h2Prime) / 2;
  if (Math.abs(h1Prime - h2Prime) > 180) {
    if (h1Prime + h2Prime < 360) {
      hbarPrime += 180;
    } else {
      hbarPrime -= 180;
    }
  }

  const T = 1 - 0.17 * Math.cos((hbarPrime - 30) * degToRad)
            + 0.24 * Math.cos((2 * hbarPrime) * degToRad)
            + 0.32 * Math.cos((3 * hbarPrime + 6) * degToRad)
            - 0.20 * Math.cos((4 * hbarPrime - 63) * degToRad);

  const Sl = 1 + (0.015 * Math.pow(LbarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LbarPrime - 50, 2));
  const Sc = 1 + 0.045 * CbarPrime;
  const Sh = 1 + 0.015 * CbarPrime * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((hbarPrime - 274) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)));
  const Rt = -Rc * Math.sin(2 * deltaTheta * degToRad);

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const dE = Math.sqrt(
    Math.pow(deltaLPrime / (kL * Sl), 2) +
    Math.pow(deltaCPrime / (kC * Sc), 2) +
    Math.pow(deltaHPrime / (kH * Sh), 2) +
    Rt * (deltaCPrime / (kC * Sc)) * (deltaHPrime / (kH * Sh))
  );

  return dE;
}

/**
 * Extract dominant colors using downsampling and 5-bit color binning
 */
async function extractDominantColors(imageBuffer, sampleSize = 128) {
  // Downsample to sampleSize x sampleSize for deterministic quantization
  const { data, info } = await sharp(imageBuffer)
    .resize(sampleSize, sampleSize, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  const colorBins = new Map();

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Quantize to 5-bit buckets (32 levels per channel, 0..248 step 8)
    const qR = (r >> 3) << 3;
    const qG = (g >> 3) << 3;
    const qB = (b >> 3) << 3;
    const key = (qR << 16) | (qG << 8) | qB;

    const existing = colorBins.get(key) || { rSum: 0, gSum: 0, bSum: 0, count: 0 };
    existing.rSum += r;
    existing.gSum += g;
    existing.bSum += b;
    existing.count++;
    colorBins.set(key, existing);
  }

  const dominant = [];
  for (const [key, item] of colorBins.entries()) {
    const coverage = (item.count / totalPixels) * 100;
    if (coverage >= 3.0) { // Only colors with >= 3% visual presence
      const avgR = Math.round(item.rSum / item.count);
      const avgG = Math.round(item.gSum / item.count);
      const avgB = Math.round(item.bSum / item.count);
      const hex = rgbToHex(avgR, avgG, avgB);

      dominant.push({
        hex,
        rgb: { r: avgR, g: avgG, b: avgB },
        lab: rgbToXyz(avgR, avgG, avgB) ? xyzToLab(rgbToXyz(avgR, avgG, avgB).x, rgbToXyz(avgR, avgG, avgB).y, rgbToXyz(avgR, avgG, avgB).z) : { l: 0, a: 0, b: 0 },
        coveragePercent: Number(coverage.toFixed(1))
      });
    }
  }

  // Sort descending by visual coverage
  return dominant.sort((a, b) => b.coveragePercent - a.coveragePercent);
}

/**
 * Runs deterministic visual checks on an image creative
 */
async function runDeterministicVisualChecks(imageBuffer, { approvedPalettes = [], minDimension = 600 } = {}) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const findings = [];

  // 1. Resolution Check
  if (width < minDimension || height < minDimension) {
    findings.push({
      quote: `Creative image resolution ${width}x${height} px`,
      category: 'visual',
      severity: 'medium',
      confidence: 'clear',
      sourceType: 'clause',
      sourceId: 'G-14',
      reason: `Uploaded marketing visual (${width}x${height} px) is below minimum recommended ${minDimension}x${minDimension} px standard, causing blurriness on high-DPI displays.`,
      suggestion: `Export and upload high-resolution asset at $\\ge 1200\\text{px}$ width.`,
      status: 'open',
      measured: {
        width,
        height,
        minRecommended: minDimension,
        aspectRatio: Number((width / (height || 1)).toFixed(2))
      }
    });
  }

  // 2. Palette Color Checks
  const approvedColors = [];
  approvedPalettes.forEach(p => {
    if (Array.isArray(p.palette)) {
      p.palette.forEach(c => {
        approvedColors.push({
          hex: c.hex,
          name: c.name || c.hex,
          tolerance: c.tolerance || 12,
          lab: hexToLab(c.hex),
          paletteName: p.name
        });
      });
    }
  });

  if (approvedColors.length > 0) {
    const dominantColors = await extractDominantColors(imageBuffer);

    dominantColors.forEach(detected => {
      // Find closest approved color
      let minDistance = Infinity;
      let nearestColor = null;

      for (const approved of approvedColors) {
        const dE = deltaE2000(detected.lab, approved.lab);
        if (dE < minDistance) {
          minDistance = dE;
          nearestColor = approved;
        }
      }

      // Check if distance exceeds tolerance
      if (nearestColor && minDistance > nearestColor.tolerance) {
        findings.push({
          quote: `Off-palette color ${detected.hex} (${detected.coveragePercent}% coverage)`,
          category: 'visual',
          severity: detected.coveragePercent >= 15 ? 'high' : 'medium',
          confidence: 'clear',
          sourceType: 'clause',
          sourceId: 'G-16',
          reason: `Dominant color ${detected.hex} represents ${detected.coveragePercent}% of creative area but deviates by ΔE = ${minDistance.toFixed(1)} from nearest approved brand color "${nearestColor.name}" (${nearestColor.hex}, tolerance: ${nearestColor.tolerance}).`,
          suggestion: `Harmonize off-palette elements with approved brand color "${nearestColor.name}" (${nearestColor.hex}).`,
          status: 'open',
          measured: {
            detectedHex: detected.hex,
            coveragePercent: detected.coveragePercent,
            nearestHex: nearestColor.hex,
            nearestName: nearestColor.name,
            deltaE: Number(minDistance.toFixed(2)),
            tolerance: nearestColor.tolerance
          }
        });
      }
    });
  }

  return {
    findings,
    metadata: {
      width,
      height,
      format: metadata.format
    }
  };
}

module.exports = {
  rgbToXyz,
  xyzToLab,
  hexToLab,
  hexToRgb,
  rgbToHex,
  deltaE2000,
  extractDominantColors,
  runDeterministicVisualChecks
};
