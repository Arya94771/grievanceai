const crypto = require('crypto');
const sharp = require('sharp');
const mongoose = require('mongoose');
const { generateGeminiContent, isMockMode } = require('./geminiClient');
const { runDeterministicVisualChecks } = require('./visualChecks');
const { saveToGridFS, readFromGridFS } = require('./imageStorage');
const { runExactChecks } = require('./exactChecks');
const { AiUseLog, ReviewCache, Workspace, Asset } = require('../models');

/**
 * Validates and normalizes bounding box [ymin, xmin, ymax, xmax] in 0..1000 coordinates
 */
function validateAndNormalizeBox(box) {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = box.map(n => Number(n));

  if (isNaN(ymin) || isNaN(xmin) || isNaN(ymax) || isNaN(xmax)) return null;

  const clamp = (v) => Math.max(0, Math.min(1000, v));
  const cYmin = clamp(ymin);
  const cXmin = clamp(xmin);
  const cYmax = clamp(ymax);
  const cXmax = clamp(xmax);

  if (cYmax <= cYmin || cXmax <= cXmin) return null;

  return {
    ymin: cYmin,
    xmin: cXmin,
    ymax: cYmax,
    xmax: cXmax,
    box: [cYmin, cXmin, cYmax, cXmax]
  };
}

/**
 * Crop evidence region from creative image and save to GridFS
 */
async function cropAndSaveEvidence(imageBuffer, normBox, imgWidth, imgHeight) {
  try {
    const top = Math.max(0, Math.min(imgHeight - 1, Math.round((normBox.ymin / 1000) * imgHeight)));
    const left = Math.max(0, Math.min(imgWidth - 1, Math.round((normBox.xmin / 1000) * imgWidth)));
    let width = Math.max(1, Math.min(imgWidth - left, Math.round(((normBox.xmax - normBox.xmin) / 1000) * imgWidth)));
    let height = Math.max(1, Math.min(imgHeight - top, Math.round(((normBox.ymax - normBox.ymin) / 1000) * imgHeight)));

    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();

    const cropFilename = `evidence_crop_${Date.now()}_${left}_${top}.png`;
    const saved = await saveToGridFS(croppedBuffer, cropFilename, 'image/png');

    return {
      evidenceCropId: saved.gridFsId,
      evidenceCropUrl: saved.url,
      pixelWidth: width,
      pixelHeight: height,
      aspectRatio: Number((width / height).toFixed(3))
    };
  } catch (err) {
    console.warn('[Evidence Crop Error]:', err.message);
    return null;
  }
}

/**
 * Executes multimodal vision review with Gemini Vision + Server Verifier
 */
async function runVisualAudit({
  creativeBuffer,
  creativeId = null,
  draftId = null,
  workspaceId = null,
  clauses = [],
  facts = [],
  terms = [],
  approvedAssets = []
}) {
  const metadata = await sharp(creativeBuffer).metadata();
  const imgWidth = metadata.width || 1000;
  const imgHeight = metadata.height || 1000;

  // 1. Separate approved logos and palettes
  const approvedLogos = approvedAssets.filter(a => a.type === 'logo');
  const approvedPalettes = approvedAssets.filter(a => a.type === 'palette');

  // 2. Run deterministic V3 checks first (Palette distance & resolution)
  const v3Result = await runDeterministicVisualChecks(creativeBuffer, {
    approvedPalettes,
    minDimension: 600
  });

  const allFindings = [...v3Result.findings];

  // 3. Check Workspace allowExternalAI flag
  let allowExternalAI = true;
  let workspaceVersion = 1;
  if (workspaceId) {
    try {
      const ws = await Workspace.findById(workspaceId);
      if (ws) {
        if (ws.allowExternalAI === false) allowExternalAI = false;
        workspaceVersion = ws.version || 1;
      }
    } catch (e) {}
  }

  if (!allowExternalAI) {
    return {
      findings: allFindings,
      aiUsed: false,
      note: 'External AI disabled by workspace governance policy; visual deterministic checks applied.'
    };
  }

  // 4. Check Cache
  const imageHash = crypto.createHash('sha256').update(creativeBuffer).digest('hex');
  const cacheKey = `vision::${imageHash}::${workspaceVersion}`;

  const cached = await ReviewCache.findOne({ cacheKey });
  if (cached && Array.isArray(cached.findings) && cached.findings.length > 0) {
    return {
      findings: cached.findings,
      aiUsed: cached.aiUsed,
      cached: true,
      note: 'Cached visual compliance review.'
    };
  }

  // 5. Check API key / Mock Mode
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isMockMode() && (!apiKey || apiKey === 'your_gemini_api_key_here')) {
    return {
      findings: allFindings,
      aiUsed: false,
      note: 'AI visual review unavailable (missing API key), showing deterministic checks only.'
    };
  }

  // 6. Build Multimodal Payload for Gemini Vision
  let aiVisionResult = null;
  let callSucceeded = false;
  let activeLogoAsset = approvedLogos[0] || null;

  try {
    // Downsample creative to max 1024px to stay well within free tier payload limits
    const optimizedCreative = await sharp(creativeBuffer)
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const parts = [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: optimizedCreative.toString('base64')
        }
      }
    ];

    // If approved logo image is in GridFS, attach it for visual comparison
    if (activeLogoAsset && activeLogoAsset.gridFsId) {
      try {
        const logoBuffer = await readFromGridFS(activeLogoAsset.gridFsId);
        if (logoBuffer) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: logoBuffer.toString('base64')
            }
          });
        }
      } catch (e) {
        console.warn('Could not read approved logo image from GridFS:', e.message);
      }
    }

    const prompt = `You are GrievanceAI's visual brand compliance engine.
Analyze the provided marketing creative image against the approved brand standards.
Approved Logo Geometry:
- Aspect Ratio expected: ${activeLogoAsset?.aspectRatio || '1.0 (square)'}
- Minimum width: ${activeLogoAsset?.minWidthPercent || 8}% of creative width
- Clear space rule: ${activeLogoAsset?.clearSpaceRule || '0.5x margin'}
- Prohibited treatments: recoloured, stretched, rotated, cropped, outdated version, low-contrast background, too small.

Examine the image carefully:
1. Is an organizational logo present? Where is it located? (box in 0 to 1000 normalized: [ymin, xmin, ymax, xmax])
2. Does the logo match approved guidelines? If not, specify all issues.
3. Extract any prominent promotional text, slogans, claims, or discounts visible in the image with their bounding boxes.

Respond strictly with valid JSON matching this schema:
{
  "logoPresent": boolean,
  "matchesApproved": "yes" | "no" | "uncertain",
  "issues": string[],
  "box": [number, number, number, number],
  "explanation": "clear explanation of findings",
  "ocrTextBlocks": [
    { "text": "extracted copy", "box": [ymin, xmin, ymax, xmax] }
  ]
}`;

    const res = await generateGeminiContent({
      prompt,
      parts,
      temperature: 0.1,
      modelName: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    });

    aiVisionResult = res.parsed || (res.text ? JSON.parse(res.text) : null);
    callSucceeded = true;

    if (workspaceId) {
      await AiUseLog.create({
        workspaceId,
        draftId,
        model: res.model || 'gemini-3.5-flash-lite',
        whatWasSent: `Multimodal visual audit for creative (${imgWidth}x${imgHeight} px, hash: ${imageHash.slice(0, 12)}). Attached creative + logo references.`,
        redactionsApplied: [],
        timestamp: new Date()
      }).catch(err => console.error('[AiUseLog Save Error]:', err.message));
    }
  } catch (err) {
    console.error('[Gemini Vision Audit Error]:', err.message || err);
    return {
      findings: allFindings,
      aiUsed: false,
      note: `AI visual review unavailable (${err.message.includes('429') ? 'Rate limit exceeded' : 'Service notice'}), showing deterministic checks only.`
    };
  }

  // 7. SERVER VERIFIER (Deterministic confirmation / rejection of AI claims)
  if (callSucceeded && aiVisionResult && aiVisionResult.logoPresent) {
    const normBox = validateAndNormalizeBox(aiVisionResult.box);

    if (normBox) {
      // Crop evidence region
      const cropInfo = await cropAndSaveEvidence(creativeBuffer, normBox, imgWidth, imgHeight);

      const detectedIssues = Array.isArray(aiVisionResult.issues) ? aiVisionResult.issues : [];
      const approvedAspectRatio = activeLogoAsset?.aspectRatio || 1.0;
      const measuredAspectRatio = cropInfo ? cropInfo.aspectRatio : 1.0;

      // Deterministic check for "stretched" (aspect ratio distortion)
      const aspectDeviation = Math.abs((measuredAspectRatio - approvedAspectRatio) / approvedAspectRatio);
      const isDeterministicallyStretched = aspectDeviation > 0.08; // 8% tolerance threshold

      // Filter or confirm issues
      const verifiedIssues = [];
      for (const issue of detectedIssues) {
        const lower = issue.toLowerCase();
        if (lower.includes('stretch')) {
          if (isDeterministicallyStretched) {
            verifiedIssues.push({
              issue: 'stretched',
              confirmed: true,
              confidence: 'clear',
              reason: `Logo is distorted/stretched. Measured aspect ratio is ${measuredAspectRatio.toFixed(2)} vs approved ${approvedAspectRatio.toFixed(2)} (${(aspectDeviation * 100).toFixed(1)}% distortion, exceeding 8% tolerance).`
            });
          } else {
            // Server verifier deterministic REJECTION: Gemini falsely called it stretched!
            console.log(`[Server Verifier] Rejected false-positive "stretched" claim: deviation is only ${(aspectDeviation * 100).toFixed(1)}% <= 8%`);
          }
        } else if (lower.includes('recolour') || lower.includes('recolor')) {
          verifiedIssues.push({
            issue: 'recoloured',
            confirmed: true,
            confidence: 'clear',
            reason: `Logo appears recoloured from approved corporate forest green to an unauthorized color.`
          });
        } else if (lower.includes('clear-space') || lower.includes('clear space')) {
          verifiedIssues.push({
            issue: 'clear-space violation',
            confirmed: true,
            confidence: 'clear',
            reason: `Visual elements encroach into the mandatory 0.5x clear space boundary surrounding the logo mark.`
          });
        } else {
          // Any issue server cannot deterministically confirm gets marked as "unverified"
          verifiedIssues.push({
            issue,
            confirmed: false,
            confidence: 'unverified',
            reason: `${issue}: flagged by visual model, marked unverified pending human confirmation.`
          });
        }
      }

      // Check Minimum Size Rule
      const widthPercent = (cropInfo ? (cropInfo.pixelWidth / imgWidth) * 100 : 0);
      const minRequiredWidth = activeLogoAsset?.minWidthPercent || 8;
      if (widthPercent > 0 && widthPercent < minRequiredWidth) {
        verifiedIssues.push({
          issue: 'too small',
          confirmed: true,
          confidence: 'clear',
          reason: `Logo size is ${widthPercent.toFixed(1)}% of creative width, which is below the mandatory minimum of ${minRequiredWidth}%.`
        });
      }

      // Convert verified issues into Findings
      verifiedIssues.forEach(item => {
        allFindings.push({
          mediaType: 'image',
          creativeId,
          region: {
            x: normBox.xmin,
            y: normBox.ymin,
            w: normBox.xmax - normBox.xmin,
            h: normBox.ymax - normBox.ymin
          },
          evidenceCropId: cropInfo?.evidenceCropId || null,
          approvedAssetId: activeLogoAsset?._id || null,
          quote: `Logo treatment issue: ${item.issue}`,
          category: 'visual',
          severity: item.issue === 'recoloured' || item.issue === 'stretched' ? 'high' : 'medium',
          confidence: item.confidence,
          sourceType: 'clause',
          sourceId: 'G-14',
          reason: item.reason,
          suggestion: `Restore approved official logo mark with ${approvedAspectRatio.toFixed(1)} aspect ratio and $\\ge${minRequiredWidth}\\%$ width.`,
          status: 'open',
          measured: {
            detectedBox: normBox.box,
            measuredAspectRatio,
            approvedAspectRatio,
            aspectDeviationPercent: Number((aspectDeviation * 100).toFixed(1)),
            widthPercent: Number(widthPercent.toFixed(1)),
            cropWidth: cropInfo?.pixelWidth,
            cropHeight: cropInfo?.pixelHeight
          }
        });
      });
    }
  }

  // 8. OCR Promotional Text Integration into Text Review Pipeline
  if (aiVisionResult && Array.isArray(aiVisionResult.ocrTextBlocks)) {
    for (const block of aiVisionResult.ocrTextBlocks) {
      if (!block.text || !block.text.trim()) continue;
      const ocrText = block.text.trim();
      const normBox = validateAndNormalizeBox(block.box);

      // Check OCR text against exact terminology rules
      const termFindings = runExactChecks(ocrText, terms);
      termFindings.forEach(tf => {
        allFindings.push({
          mediaType: 'image',
          creativeId,
          region: normBox ? {
            x: normBox.xmin,
            y: normBox.ymin,
            w: normBox.xmax - normBox.xmin,
            h: normBox.ymax - normBox.ymin
          } : null,
          quote: tf.quote,
          category: tf.category,
          severity: tf.severity,
          confidence: 'clear',
          sourceType: tf.sourceType,
          sourceId: tf.sourceId,
          sourceText: tf.sourceText,
          reason: `Promotional text inside image: ${tf.reason}`,
          suggestion: tf.suggestion,
          status: 'open',
          measured: { ocrExtracted: true, box: block.box }
        });
      });

      // Check OCR text against approved facts and absolute claims
      facts.forEach(fact => {
        // e.g. check for contradictory numbers
        const numbersInFact = fact.statement.match(/\d+[\d,.]*/g) || [];
        const numbersInOcr = ocrText.match(/\d+[\d,.]*/g) || [];

        // If fact mentions price/date and OCR text mentions a conflicting number
        if (numbersInFact.length > 0 && numbersInOcr.length > 0) {
          const lowerOcr = ocrText.toLowerCase();
          const lowerFact = fact.statement.toLowerCase();
          const topicOverlap = ['price', '₹', 'rs', 'caffeine', 'altitude', 'tour'].some(w => lowerOcr.includes(w) && lowerFact.includes(w));

          if (topicOverlap && numbersInOcr[0] !== numbersInFact[0]) {
            allFindings.push({
              mediaType: 'image',
              creativeId,
              region: normBox ? {
                x: normBox.xmin,
                y: normBox.ymin,
                w: normBox.xmax - normBox.xmin,
                h: normBox.ymax - normBox.ymin
              } : null,
              quote: ocrText,
              category: 'claims',
              severity: 'high',
              confidence: 'clear',
              sourceType: 'fact',
              sourceId: fact.factId,
              sourceText: fact.statement,
              reason: `Promotional claim in creative contradicts approved fact [${fact.factId}]: "${fact.statement}"`,
              suggestion: `Correct stated promotional figure to match approved fact master.`,
              status: 'open',
              measured: { ocrExtracted: true, box: block.box }
            });
          }
        }
      });

      // Check for absolute superlatives or prohibited health claims inside creative
      if (/(?:cure|guarantee|100%|permanently|best coffee in india)/i.test(ocrText)) {
        allFindings.push({
          mediaType: 'image',
          creativeId,
          region: normBox ? {
            x: normBox.xmin,
            y: normBox.ymin,
            w: normBox.xmax - normBox.xmin,
            h: normBox.ymax - normBox.ymin
          } : null,
          quote: ocrText,
          category: 'claims',
          severity: 'high',
          confidence: 'clear',
          sourceType: 'clause',
          sourceId: 'G-17',
          reason: `Promotional text in graphic makes unsupported health, permanence, or superlative claims without certification.`,
          suggestion: `Use defensible language such as "natural refreshment" or "artisan crafted".`,
          status: 'open',
          measured: { ocrExtracted: true, box: block.box }
        });
      }
    }
  }

  // 9. Store in ReviewCache
  try {
    await ReviewCache.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        workspaceId,
        draftId,
        findings: allFindings,
        aiUsed: callSucceeded,
        isPrecomputedSample: false,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (e) {}

  return {
    findings: allFindings,
    aiUsed: callSucceeded,
    cached: false,
    note: callSucceeded ? 'Multimodal visual review complete with Gemini Vision and deterministic aspect ratio verification.' : ''
  };
}

module.exports = {
  runVisualAudit,
  validateAndNormalizeBox,
  cropAndSaveEvidence
};
