const sharp = require('sharp');
const { writeToGridFS } = require('../services/imageStorage');
const { Asset, Draft, Finding, ReviewCache } = require('../models');

/**
 * Programmatically generate Brewline brand asset (logo) and 3 flawed creatives
 * No external internet assets required. Pure SVG -> Sharp rasterization.
 */

// 1. Approved Brewline Logo (400x120 SVG rasterized to PNG, Forest Green #1B4332 on transparent/white)
async function generateApprovedLogoBuffer() {
  const svg = `
    <svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="120" fill="#FFFFFF" rx="8"/>
      <circle cx="60" cy="60" r="32" fill="#1B4332"/>
      <path d="M 50 65 Q 60 40 70 65 Z" fill="#D8F3DC"/>
      <text x="110" y="68" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#1B4332" letter-spacing="1">BREWLINE</text>
      <text x="112" y="88" font-family="Arial, sans-serif" font-size="12" fill="#52B788" letter-spacing="3">COFFEE CO.</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// 2. Creative 1: Recolored Logo violation (Red #E63946 instead of Forest Green #1B4332)
async function generateCreative1Buffer() {
  const svg = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#F8F9FA"/>
      <!-- Recolored Logo (Red violation) -->
      <g transform="translate(200, 100)">
        <rect width="400" height="120" fill="#FFFFFF" stroke="#E63946" stroke-width="2" rx="8"/>
        <circle cx="60" cy="60" r="32" fill="#E63946"/>
        <path d="M 50 65 Q 60 40 70 65 Z" fill="#FFFFFF"/>
        <text x="110" y="68" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#E63946" letter-spacing="1">BREWLINE</text>
        <text x="112" y="88" font-family="Arial, sans-serif" font-size="12" fill="#E63946" letter-spacing="3">COFFEE CO.</text>
      </g>
      <text x="400" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="32" fill="#1B4332">Special Monsoon Harvest</text>
      <text x="400" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#2D6A4F">Direct from our high-elevation estate in Coorg</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// 3. Creative 2: Stretched Logo violation (aspect ratio distorted, stretched horizontally)
async function generateCreative2Buffer() {
  const svg = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#FFFFFF"/>
      <!-- Stretched Logo: width 550, height 70 (normal is 400x120 -> 3.33 aspect ratio; this is ~7.8) -->
      <g transform="translate(125, 80) scale(1.375, 0.58)">
        <rect width="400" height="120" fill="#FFFFFF" rx="8"/>
        <circle cx="60" cy="60" r="32" fill="#1B4332"/>
        <path d="M 50 65 Q 60 40 70 65 Z" fill="#D8F3DC"/>
        <text x="110" y="68" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#1B4332">BREWLINE</text>
        <text x="112" y="88" font-family="Arial, sans-serif" font-size="12" fill="#52B788">COFFEE CO.</text>
      </g>
      <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="30" fill="#1B4332">Estate Cold Brew Blend</text>
      <text x="400" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#495057">Handcrafted in small batches &bull; 100% Arabica</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

// 4. Creative 3: Off-palette background (Hot Magenta #D90429 / Neon Yellow) + embedded unsupported claim
async function generateCreative3Buffer() {
  const svg = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <!-- Off-palette vibrant Magenta background #D90429 -->
      <rect width="800" height="600" fill="#D90429"/>
      <g transform="translate(200, 60)">
        <rect width="400" height="120" fill="#FFFFFF" rx="8"/>
        <circle cx="60" cy="60" r="32" fill="#1B4332"/>
        <path d="M 50 65 Q 60 40 70 65 Z" fill="#D8F3DC"/>
        <text x="110" y="68" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#1B4332">BREWLINE</text>
        <text x="112" y="88" font-family="Arial, sans-serif" font-size="12" fill="#52B788">COFFEE CO.</text>
      </g>
      <text x="400" y="270" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="34" fill="#FFFFFF">INDIA'S ONLY 100% ORGANIC COFFEE</text>
      <text x="400" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#FFDDD2">Guaranteed lowest price in India &bull; ₹149 per pack</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Seed visual brand assets, attach sample creatives to drafts, and pre-cache their reviews
 */
async function seedVisualBrandAssets(workspaceId) {
  console.log('[VisualSeed] Seeding programmatic brand logo and visual creatives...');

  // 1. Seed or update approved logo in Asset collection
  const logoBuf = await generateApprovedLogoBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoFileId = await writeToGridFS(logoBuf, 'brewline-logo-primary.png', 'image/png');

  let logoAsset = await Asset.findOne({ workspaceId, type: 'logo', name: 'Primary Brewline Wordmark' });
  if (!logoAsset) {
    logoAsset = await Asset.create({
      workspaceId,
      name: 'Primary Brewline Wordmark',
      type: 'logo',
      url: `/api/brand-kit/assets/${logoFileId}`,
      fileId: logoFileId,
      aspectRatio: +(logoMeta.width / logoMeta.height).toFixed(3),
      minWidthPercent: 15,
      clearSpaceRule: 'Equal to height of letter B',
      forbiddenTreatments: ['Do not recolor', 'Do not distort aspect ratio', 'Do not place on neon backgrounds'],
      palette: [
        { hex: '#1B4332', name: 'Deep Forest Green', role: 'primary', toleranceDeltaE: 10 },
        { hex: '#2D6A4F', name: 'Emerald Canopy', role: 'secondary', toleranceDeltaE: 12 },
        { hex: '#D8F3DC', name: 'Mint Cream', role: 'accent', toleranceDeltaE: 14 }
      ],
      createdAt: new Date()
    });
    console.log(`[VisualSeed] Created approved logo Asset with GridFS id: ${logoFileId}`);
  }

  // 2. Attach flawed sample creatives to existing sample drafts
  const drafts = await Draft.find({ workspaceId }).sort({ createdAt: 1 });
  if (drafts.length >= 3) {
    const c1Buf = await generateCreative1Buffer();
    const c1Meta = await sharp(c1Buf).metadata();
    const c1Id = await writeToGridFS(c1Buf, 'creative-recolored-logo.png', 'image/png');

    const c2Buf = await generateCreative2Buffer();
    const c2Meta = await sharp(c2Buf).metadata();
    const c2Id = await writeToGridFS(c2Buf, 'creative-stretched-logo.png', 'image/png');

    const c3Buf = await generateCreative3Buffer();
    const c3Meta = await sharp(c3Buf).metadata();
    const c3Id = await writeToGridFS(c3Buf, 'creative-off-palette-claim.png', 'image/png');

    // Attach to Draft 1
    drafts[0].creatives = [{
      fileId: c1Id,
      filename: 'creative-recolored-logo.png',
      mimeType: 'image/png',
      size: c1Buf.length,
      width: c1Meta.width,
      height: c1Meta.height,
      uploadedAt: new Date()
    }];
    await drafts[0].save();

    // Attach to Draft 2
    drafts[1].creatives = [{
      fileId: c2Id,
      filename: 'creative-stretched-logo.png',
      mimeType: 'image/png',
      size: c2Buf.length,
      width: c2Meta.width,
      height: c2Meta.height,
      uploadedAt: new Date()
    }];
    await drafts[1].save();

    // Attach to Draft 3
    drafts[2].creatives = [{
      fileId: c3Id,
      filename: 'creative-off-palette-claim.png',
      mimeType: 'image/png',
      size: c3Buf.length,
      width: c3Meta.width,
      height: c3Meta.height,
      uploadedAt: new Date()
    }];
    await drafts[2].save();

    console.log('[VisualSeed] Attached 3 flawed creatives to sample drafts in GridFS');
  }

  return { logoAsset };
}

module.exports = {
  seedVisualBrandAssets,
  generateApprovedLogoBuffer,
  generateCreative1Buffer,
  generateCreative2Buffer,
  generateCreative3Buffer
};
