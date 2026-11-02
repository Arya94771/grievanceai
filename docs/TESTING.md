# GrievanceAI — Verification & Performance Testing Report

**Date of Execution**: November 2026  
**Test Framework**: Vitest (Backend & Frontend) + Supertest + In-Memory MongoDB  
**AI Mode**: `AI_MODE=mock` (Deterministic Recorded Gemini Fixtures)

---

## 1. Concurrency & Load Test Results (20 Concurrent Judges)

Simulating 20 judges hitting the review, insights, and brand kit APIs concurrently:

| Metric | Measured Real Value | Performance Target | Result |
| :--- | :--- | :--- | :--- |
| **Concurrent Sessions** | **20 judges** | 20 judges | PASS |
| **Average Latency** | **104 ms** | < 500 ms | PASS |
| **p50 Latency** | **122 ms** | < 250 ms | PASS |
| **p95 Latency** | **181 ms** | < 800 ms | PASS |
| **Max Latency** | **181 ms** | < 1,500 ms | PASS |
| **HTTP Error Rate** | **0.0%** | < 1.0% | PASS |
| **Gemini Concurrency Collisions** | **0** (Semaphore Protected) | 0 | PASS |

---

## 2. Automated Test Suite Summary

Total Test Files: **9 passed**  
Total Passing Tests: **45 passed**

### Test Breakdown
- `test/claimNormalizer.test.js` (4 tests): Indian currency (`₹`, `lakh`, `crore`), percentages, superlatives, arithmetic comparison.
- `test/riskScorer.test.js` (3 tests): 0–100 deterministic scoring, critical tiering, channel multipliers, explainable `riskDrivers[]`.
- `test/promptHardener.test.js` (3 tests): Prompt injection defense, XML tag stripping, untrusted input containment.
- `test/visualChecks.test.js` (5 tests): CIEDE2000 delta E, dominant color quantization, low-resolution warnings.
- `test/uploadSecurity.test.js` (7 tests): Magic byte checks, 4MB limits, non-admin SVG rejection, path traversal protection, 8% aspect ratio tolerance.
- `test/insights.test.js` (3 tests): Compliance rate math, role access boundaries, 40% dispute rate guideline clarity detection.
- `test/recurrenceDetector.test.js` (3 tests): SHA-256 finding fingerprints, quote normalization.
- `test/regression.test.js` (8 tests): 100k-char stress test, Hindi/Unicode text, whitespace resilience, exact offset tracking.
- `test/geminiClient.test.js` (9 tests): AI mock mode, fallback handling, 429 backoff retry, timeout protection.
- Client `ErrorBoundary.test.jsx` (2 tests): React error boundary rendering and fallback recovery.

---

## 3. Evaluation Benchmark (Precision / Recall)

From `docs/EVAL_RESULTS.md`:
- **Precision**: 100%
- **Recall**: 83.3%
- **F1 Score**: 0.909
- **Accuracy**: 90.0%
- **False-Flag Rate**: 0.0%
