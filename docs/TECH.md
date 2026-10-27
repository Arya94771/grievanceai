# GrievanceAI — Technical Architecture & Specifications

GrievanceAI is architected as a monolithic web service deploying as a single Render Web Service. Express hosts the backend API and serves the production-built React application, eliminating all CORS issues and domain synchronization overhead.

---

## 1. System Architecture Diagram

```
                 +-----------------------------------------+
                 |              Web Browser                |
                 |  (React 19 + Vite SPA, Single Port)     |
                 +--------------------+--------------------+
                                      |
                     HTTP / REST API  | Static Assets
                                      v
                 +-----------------------------------------+
                 |           Express.js Server             |
                 |  - Security & JWT Auth Middleware       |
                 |  - Rate Limiter (15 RPM free tier)      |
                 |  - Review Result Cache (SHA-256)        |
                 |  - 6-Hour Auto-Reset Background Job     |
                 |  - Static Client Server (/client/dist)  |
                 +-----+--------------------+--------------+
                       |                    |
        Database Query |     AI Review &    | PII Redaction
                       v     Verification   v
        +-------------------+      +-------------------------------+
        |   MongoDB Atlas   |      | Google Gemini API             |
        | - Users           |      | - Model: gemini-3.5-flash-lite|
        | - Workspaces      |      | - Structured JSON Output      |
        | - Clauses & Facts |      | - Second-Pass Verification    |
        | - Drafts & Revisions     | - Concurrency Limiter & Retry |
        | - Findings & Logs |      +-------------------------------+
        | - ReviewCache     |
        +-------------------+
```

---

## 2. Technology Stack & Key Libraries

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.3.1` | Single-page UI with tailored role views |
| **Build Tool** | Vite | `^8.3.5` | Fast bundling and asset optimization |
| **Icons** | Lucide React | `^1.16.0` | Accessible, modern iconography |
| **Backend Framework** | Node.js + Express | `^4.21.2` | REST API and static bundle hosting |
| **Database & ODM** | MongoDB Atlas / Mongoose | `^8.9.5` | Cloud multi-document persistence |
| **AI LLM Engine** | Google Gemini (`gemini-3.5-flash-lite`) | via `@google/generative-ai` | Structured compliance auditing |
| **Document Parsers** | `mammoth` & `pdf-parse` | `^1.9.0` / `^1.1.1` | File text extraction (.docx, .pdf, .txt) |
| **Authentication** | `jsonwebtoken` & `bcryptjs` | `^9.0.2` / `^2.4.3` | Signed stateless token authentication |
| **Rate Limiter** | `express-rate-limit` | `^7.5.0` | Review endpoint protection |

---

## 3. Data Handling, Security & AI Pipeline

### PII Redaction
Before any draft text or prompt is dispatched across the network to Google AI Studio:
- **Email Addresses**: Regex-scanned and replaced with tokens (`[REDACTED_EMAIL_1]`).
- **Phone Numbers**: Verified for length (7–13 digits) and replaced with tokens (`[REDACTED_PHONE_1]`).
- All applied redactions are recorded in `AiUseLog`.

### Gemini Model Selection & Free-Tier Limits
- **Model**: `gemini-3.5-flash-lite` (with automatic backoff fallback to `gemini-flash-latest`).
- **Free-Tier Limits**:
  - 15 Requests Per Minute (RPM)
  - 1,000,000 Tokens Per Minute (TPM)
  - 1,500 Requests Per Day (RPD)
- **Rate-Limiting Defense**: The `/api/drafts/:id/review` endpoint is clamped to 15 RPM using `express-rate-limit`.

### Two-Stage Verification Pipeline
1. **Server-Side Verifier (Stage 1 — Mandatory Guardrail)**:
   - **Verbatim Quote Match**: The server searches the original draft for the exact substring. If not found verbatim (even after whitespace normalization), the finding is discarded.
   - **Deterministic Offset Computation**: Character indexes (`start` and `end`) are computed strictly by the server. Model-generated offsets are never trusted.
   - **Source ID Cross-Verification**: The server checks that the cited `sourceId` exists in the brand kit (in `Clause`, `Fact`, or `Term`). If invalid, the source is cleared and confidence is marked as `unverified`.
2. **Second-Pass AI Verification (Stage 2 — T14)**:
   - Evaluates claims and clear-confidence findings in a batched call asking whether the cited source truly substantiates the flagged violation.
   - If substantiated: assigned `"Verified against <ID>"`.
   - If not: downgraded to `unverified` and source is stripped.

### Resilience & Review Caching (T15)
- **Hash Composition**: Reviews are indexed by `sha256(content + intent + workspace.version)`.
- **Cache Hit**: Instantaneous return of findings with `"Cached review result"`.
- **Cache Invalidation**: Automatically triggered whenever a brand clause, fact, term, or asset is modified (which increments `workspace.version`).
- **Concurrency Limiter**: Global semaphore ensures only one live Gemini call executes at any single instant, eliminating free-tier concurrency collisions.

---

## 4. Database Collections

- `users`: Credentials, names, emails, and roles (`creator`, `manager`, `reviewer`, `admin`).
- `workspaces`: Brand organization scope and version counter (used for cache invalidation).
- `clauses`: Approved governance rules with categories and severities.
- `facts`: Canonical approved factual statements (pricing, altitudes, schedules).
- `terms`: Preferred terms and their associated banned variants.
- `assets`: Approved digital assets and brand guidelines.
- `drafts`: Multi-channel copy records with current status and active revision pointer.
- `revisions`: Immutable historical snapshots of draft text.
- `findings`: Compliance issues, citations, before/after diffs, and decision states.
- `comments`: Discussion threads per draft or attached to specific findings.
- `auditlogs`: Immutable chronological log of all governance events and override justifications.
- `aiuselogs`: Complete transparency log of prompts sent, models used, and redactions applied.
- `reviewcaches`: Precomputed and cached review evaluations keyed by content + version hash.
