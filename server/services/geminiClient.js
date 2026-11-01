const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load fixtures for mock mode
const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures', 'gemini');

function loadFixture(filename) {
  try {
    const fullPath = path.join(FIXTURES_DIR, filename);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[geminiClient] Could not load fixture ${filename}:`, err.message);
  }
  return null;
}

const fixtures = {
  monsoon: loadFixture('textReviewMonsoon.json') || [],
  coorg: loadFixture('textReviewCoorg.json') || [],
  coldBrew: loadFixture('textReviewColdBrew.json') || [],
  secondPass: loadFixture('secondPassClaims.json') || [],
  vision: loadFixture('visionReview.json') || {
    logoPresent: true,
    matchesApproved: "no",
    issues: ["recoloured"],
    box: [100, 100, 300, 400],
    explanation: "Logo appears recoloured.",
    ocrTextBlocks: []
  }
};

/**
 * Mock state controller for unit and regression testing
 */
let mockState = {
  forcedMode: null, // null | 'valid' | 'malformed_json' | 'timeout' | 'rate_limit_429'
  customResponse: null
};

function setMockMode(mode) {
  mockState.forcedMode = mode;
}

function setCustomMockResponse(resp) {
  mockState.customResponse = resp;
}

function resetMock() {
  mockState.forcedMode = null;
  mockState.customResponse = null;
}

function isMockMode() {
  if (mockState.forcedMode) return true;
  return process.env.AI_MODE === 'mock';
}

/**
 * Concurrency limiter semaphore for live Gemini calls (15 RPM free tier protection)
 */
let activeAiCalls = 0;
const aiCallQueue = [];

function acquireAiLock() {
  return new Promise((resolve) => {
    if (activeAiCalls < 1) {
      activeAiCalls++;
      resolve();
    } else {
      aiCallQueue.push(resolve);
    }
  });
}

function releaseAiLock() {
  activeAiCalls = Math.max(0, activeAiCalls - 1);
  if (aiCallQueue.length > 0) {
    const next = aiCallQueue.shift();
    activeAiCalls++;
    next();
  }
}

/**
 * Clean markdown wrapper from Gemini output
 */
function cleanJsonOutput(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Dispatch Gemini Generative call (Live or Mock)
 */
async function generateGeminiContent({
  prompt,
  parts = null, // e.g. for vision [{ inlineData: { mimeType, data } }]
  systemInstruction = '',
  temperature = 0.1,
  timeoutMs = 30000,
  modelName = null
}) {
  const activeModel = modelName || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const effectiveMode = mockState.forcedMode || (process.env.AI_MODE === 'mock' ? 'valid' : null);

  // 1. Check Mock Mode
  if (effectiveMode) {
    if (effectiveMode === 'malformed_json') {
      return {
        text: '{ "error": "malformed json unclosed bracket,',
        raw: '{ "error": "malformed json unclosed bracket,',
        aiUsed: true,
        model: activeModel,
        mock: true
      };
    }

    if (effectiveMode === 'timeout') {
      const err = new Error(`Gemini API call timed out after ${timeoutMs}ms`);
      err.code = 'ETIMEDOUT';
      throw err;
    }

    if (effectiveMode === 'rate_limit_429') {
      const err = new Error('[GoogleGenerativeAI Error]: [429 Too Many Requests] Resource has been exhausted');
      err.status = 429;
      throw err;
    }

    // Return custom mock response if set
    if (mockState.customResponse !== null) {
      const resultObj = typeof mockState.customResponse === 'function'
        ? mockState.customResponse({ prompt, parts, systemInstruction })
        : mockState.customResponse;
      return {
        text: typeof resultObj === 'string' ? resultObj : JSON.stringify(resultObj),
        parsed: typeof resultObj === 'string' ? JSON.parse(resultObj) : resultObj,
        aiUsed: true,
        model: activeModel,
        mock: true
      };
    }

    // Default mock response routing based on prompt content
    let responseData = [];
    const promptStr = String(prompt || '');

    if (parts && parts.length > 0) {
      responseData = fixtures.vision;
    } else if (promptStr.includes('SECOND PASS') || promptStr.includes('second-pass') || promptStr.includes('supports')) {
      responseData = fixtures.secondPass;
    } else if (promptStr.includes('Monsoon')) {
      responseData = fixtures.monsoon;
    } else if (promptStr.includes('Coorg')) {
      responseData = fixtures.coorg;
    } else if (promptStr.includes('Cold Brew')) {
      responseData = fixtures.coldBrew;
    } else {
      responseData = [];
    }

    return {
      text: JSON.stringify(responseData),
      parsed: responseData,
      aiUsed: true,
      model: activeModel,
      mock: true
    };
  }

  // 2. Live Gemini Call
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured in environment (GEMINI_API_KEY).');
  }

  await acquireAiLock();
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: activeModel,
      systemInstruction: systemInstruction || undefined,
      generationConfig: {
        temperature: temperature,
        responseMimeType: 'application/json'
      }
    });

    let contentPayload;
    if (parts && parts.length > 0) {
      contentPayload = [...parts, prompt];
    } else {
      contentPayload = prompt;
    }

    // Wrap with timeout promise
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        const err = new Error(`Gemini API call timed out after ${timeoutMs}ms`);
        err.code = 'ETIMEDOUT';
        reject(err);
      }, timeoutMs);
    });

    const apiPromise = model.generateContent(contentPayload);
    const result = await Promise.race([apiPromise, timeoutPromise]);
    clearTimeout(timerId);

    const rawText = result.response.text();
    const cleanedText = cleanJsonOutput(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      // Return cleaned text if JSON parsing fails
    }

    return {
      text: cleanedText,
      parsed,
      raw: rawText,
      aiUsed: true,
      model: activeModel,
      mock: false
    };
  } finally {
    releaseAiLock();
  }
}

module.exports = {
  generateGeminiContent,
  setMockMode,
  setCustomMockResponse,
  resetMock,
  isMockMode,
  acquireAiLock,
  releaseAiLock,
  cleanJsonOutput
};
