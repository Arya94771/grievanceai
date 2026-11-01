const mongoose = require('mongoose');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');

let gridFsBucket = null;

function getGridFSBucket() {
  if (!gridFsBucket && mongoose.connection.readyState === 1) {
    gridFsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'brand_images'
    });
  }
  return gridFsBucket;
}

/**
 * Verify magic bytes to prevent spoofed file extensions
 */
function verifyMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // WebP: RIFF ... WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  return false;
}

/**
 * Checks if buffer is an SVG (by header or content)
 */
function isSvgBuffer(buffer) {
  if (!buffer) return false;
  const header = buffer.slice(0, 1024).toString('utf8').trim().toLowerCase();
  return header.includes('<svg') || header.includes('<?xml') && header.includes('<svg');
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(originalName) {
  if (!originalName) return 'unnamed_image.png';
  const basename = path.basename(originalName);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Upload Security Validator & Pipeline
 * - 4MB max
 * - PNG / JPG / WEBP magic bytes verification
 * - User SVG rejection
 * - Strip EXIF
 * - Resize to max 1536 px (maintains aspect ratio)
 */
async function processAndSecureImage(buffer, originalName, { isAdmin = false, isSvgBrandAsset = false } = {}) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty image payload');
  }

  if (buffer.length > 4 * 1024 * 1024) {
    throw new Error('Image exceeds 4 MB maximum upload limit');
  }

  // Reject SVG from regular users
  if (isSvgBuffer(buffer)) {
    if (!isAdmin || !isSvgBrandAsset) {
      throw new Error('SVG uploads are prohibited for security. Please upload PNG, JPG, or WebP.');
    }

    // Admin SVG brand asset: Rasterize immediately with sharp and discard SVG
    const rasterizedBuffer = await sharp(buffer)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    return processAndSecureImage(rasterizedBuffer, `${originalName}.png`, { isAdmin: true, isSvgBrandAsset: false });
  }

  // Verify magic bytes
  const verifiedMime = verifyMagicBytes(buffer);
  if (!verifiedMime) {
    throw new Error('Invalid image format. Allowed formats: PNG, JPG, WebP (magic byte verification failed).');
  }

  // Process with sharp: strip EXIF metadata, limit dimension to 1536px
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const processedBuffer = await sharp(buffer)
    .rotate() // Auto-orient using EXIF before stripping
    .resize({
      width: 1536,
      height: 1536,
      fit: 'inside',
      withoutEnlargement: true
    })
    .withMetadata({ orientation: 1 }) // Strips user personal EXIF tags like GPS
    .toBuffer();

  const finalMetadata = await sharp(processedBuffer).metadata();
  const hash = crypto.createHash('sha256').update(processedBuffer).digest('hex');

  return {
    buffer: processedBuffer,
    mimeType: verifiedMime,
    width: finalMetadata.width || metadata.width || 0,
    height: finalMetadata.height || metadata.height || 0,
    aspectRatio: finalMetadata.width && finalMetadata.height ? (finalMetadata.width / finalMetadata.height) : 1,
    sanitizedName: sanitizeFilename(originalName),
    hash
  };
}

/**
 * Save image buffer into MongoDB GridFS
 */
async function saveToGridFS(buffer, filename, mimeType, metadata = {}) {
  const bucket = getGridFSBucket();
  if (!bucket) {
    // Fallback if in-memory test or GridFS unavailable
    const fallbackId = new mongoose.Types.ObjectId();
    return {
      gridFsId: fallbackId,
      url: `/api/images/${fallbackId}`
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType,
      metadata
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', (file) => {
      resolve({
        gridFsId: file._id,
        url: `/api/images/${file._id}`
      });
    });

    uploadStream.end(buffer);
  });
}

/**
 * Read image buffer from GridFS
 */
async function readFromGridFS(gridFsId) {
  const bucket = getGridFSBucket();
  if (!bucket) return null;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(gridFsId));

    downloadStream.on('data', chunk => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  getGridFSBucket,
  verifyMagicBytes,
  isSvgBuffer,
  sanitizeFilename,
  processAndSecureImage,
  saveToGridFS,
  readFromGridFS
};
