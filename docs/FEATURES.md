# GrievanceAI — Feature Specification & Verification Matrix

GrievanceAI is an autonomous brand-governance and content compliance platform engineered for Round 2 of the hackathon.

---

## Completed Tasks & Features (Full Specification)

### 1. Demo-First UX & Authentication (S1–S4, T3)
- **One-Click Demo Logins**: Dedicated buttons for **Creator**, **Manager**, **Reviewer**, and **Admin** — zero registration or signup barrier.
- **Judge's 60-Second Walkthrough**: Clear 4-step workflow banner on the home screen.
- **Preloaded Workspace**: Pre-seeded with "Brewline Coffee Co." (fictional artisanal roaster) with 20 brand clauses, 8 verified facts, 10 brand terminology rules, 4 brand assets, and 3 sample drafts with seeded deliberate errors.
- **Instant Role Switcher**: Top-bar role dropdown allows switching between Creator, Manager, Reviewer, and Admin without re-logging.

### 2. Brand Kit Management (T4)
- **Hierarchical Governance Elements**:
  - **Clauses**: Categorized (`tone`, `terminology`, `messaging`, `accessibility`, `claims`, `visual`) and prioritized by severity (`high`, `medium`, `low`).
  - **Verified Facts**: Canonical numerical data, pricing, altitudes, dates, and certifications.
  - **Terminology**: Preferred terms matched against banned variants with guidance notes.
  - **Assets**: Usage rules and color guidelines.
- **"Paste Guidelines" Parser**: Admin tool that automatically parses pasted unstructured guidelines text into numbered, editable clauses.
- **Role-Based Access Control**: Admins have full CRUD; Creators, Managers, and Reviewers have read-only access with an informative banner.

### 3. Deterministic Exact Checks Engine (T5)
- Plain JavaScript engine running offline without external network or AI dependencies:
  - **Banned Terms**: Whole-word, case-insensitive boundary matching with automatic case preservation.
  - **Punctuation Violations**: Detects excessive exclamation points (`!!+`).
  - **Accessibility Casing**: Flags ALL-CAPS shouting longer than 3 words (preventing screen reader letter-by-letter spelling).
  - **Link Text Rules**: Flags generic, ambiguous anchor text ("click here", "tap here", "read more") and provides WCAG-compliant action phrases.
  - **Image References**: Validates that image tags include comprehensive alt text descriptions.

### 4. Gemini AI Review Engine with Server-Side Verification (T6)
- **PII Redaction Pipeline**: Automatically strips emails (`[REDACTED_EMAIL_X]`) and phone numbers before dispatching text to Gemini.
- **Structured JSON Schema**: Uses `@google/generative-ai` with structured output schemas to enforce strict `[{ quote, category, severity, sourceId, reason, suggestion }]`.
- **Factual Claims Extraction**: Isolates pricing, dates, and superlatives. Classifies claims as:
  - *Supported*: matches an approved fact.
  - *Contradicted*: cites the exact contradicting fact ID (e.g. `F-02`).
  - *Unsupported*: flags unsubstantiated superlatives or medical claims as "unsupported" (never "false").
- **Mandatory Server-Side Verifier**:
  - Computes exact character offsets (`start`, `end`) on the server.
  - Verifies that model quotes exist verbatim in the draft (with whitespace normalization).
  - Validates that cited source IDs exist in the active brand kit; otherwise downgrades to unverified.
  - De-duplicates overlapping spans between deterministic and AI findings.
  - Logs all AI calls in `AiUseLog`.

### 5. Interactive Review UI (T7)
- **Highlighted Text Spans**: Real-time colored span overlays based on severity (red, amber, blue).
- **Interactive Finding Cards**:
  - Displays category, severity, confidence (`clear`, `possible`, `unverified`), and source ID badge.
  - **Source Citation Box**: Direct verbatim quote of the brand clause, fact, or terminology rule.
  - **Before/After Diff**: Clear visual diff showing the flagged quote and surgical suggested fix.
  - **Action Triggers**: One-click **Accept** (applies suggestion and creates new revision), **Reject** (with optional note), or **Dispute** (adds to comment thread).
- **Filtering**: By category (`claims`, `tone`, `terminology`, `accessibility`, etc.) and severity.
- **Persistent AI Banner**: Clearly discloses Gemini assistance and emphasizes that no changes are applied without human clicks.

### 6. Draft Creation & Multi-Format Ingestion (T8)
- Form input for Title, Channel (Instagram, Press Release, Email Newsletter, Blog), and Stated Intent.
- **Multi-Format Extraction**: Upload `.txt`, `.docx` (via `mammoth`), or `.pdf` (via `pdf-parse`) directly into clean text.
- Manual editor mode allowing authors to edit text directly and save new numbered revisions.

### 7. Multi-Role Approval Workflow (T9)
- **Submit for Review**: Creators transition draft from `draft` to `in_review`.
- **Manager / Reviewer Queue**: Dedicated workflow actions for reviewers.
- **Compliance Blocking**: Approval is **strictly blocked** if any open finding with `clear` confidence remains unresolved.
- **Documented Override**: Managers can override the block only by providing an explicit business justification, which is immutably logged in `AuditLog`.
- **Request Changes**: Reviewers can return drafts to `changes_requested` with mandatory feedback.
- **Collaborative Discussion**: Threaded comment system per draft for team alignment.

### 8. Revision History & Audit Trail (T10)
- **Revision List**: Tracks every draft version, author, timestamp, and edit notes.
- **Side-by-Side Diff**: Allows selecting any two revisions to compare modifications side by side.
- **Activity Timeline**: Full immutable audit trail recording every creation, review, decision, comment, and approval.

### 9. Quality & Production Readiness (T11 & T12)
- **Rate Limiting**: Review endpoint rate-limited to 15 RPM to align with Gemini free-tier caps.
- **Responsive Layout**: Validated across desktop and mobile screens down to 375px.
- **Render Cold-Start Screen**: Inline pre-loader informs users on free-tier Render spin-ups (~30s).
- **Automated Smoke Test**: `npm run smoke` runs all 3 sample drafts through full review and validates findings.

### 10. Second-Pass AI Verification (T14)
- Batched verification call assessing whether cited sources truly substantiate flagged issues.
- Displays prominent **"Verified against <ID>"** badge with green check icon.
- Automatically downgrades unsupported citations to `unverified` and strips invalid source references.

### 11. Resilience & Review Result Caching (T15)
- **Deterministic SHA-256 Caching**: Caches reviews by `sha256(content + intent + workspace.version)`.
- **Precomputed Sample Reviews**: All 3 seeded drafts are pre-evaluated at seed time for instant, zero-latency opening.
- **Concurrency Limiter**: Global queue prevents free-tier RPM and concurrency limits from being exceeded.
- **Exponential Backoff**: Two-stage backoff (1s, 2s) with candidate fallback models.

### 12. Compliance Report Export (T16)
- **Print-Friendly HTML Report**: Formatted for browser printing or saving as PDF, complete with audit trail, diff boxes, and comments.
- **Markdown Export**: Downloadable `.md` export containing the complete compliance record.

### 13. Usability & Accessibility (T17)
- **"Start here" Onboarding Card**: 4 concise, one-line steps guiding judges.
- **Inline Hint Strips**: Contextual tips across Drafts, Review, and Brand Kit screens.
- **Keyboard Shortcuts**: <kbd>A</kbd> to accept fix, <kbd>R</kbd> to reject, <kbd>&uarr;</kbd> <kbd>&darr;</kbd> / <kbd>&larr;</kbd> <kbd>&rarr;</kbd> to navigate findings.

### 14. Demo Safety & Isolation (T18)
- **Admin "Reset Demo Data" Button**: Restores entire workspace to factory seed state in one click.
- **6-Hour Auto-Reset Scheduler**: Background timer guarantees that a fresh experience is preserved for incoming judges.
- **Shared Workspace Notice**: Subtle top banner informing users of the periodic reset policy.
