# GrievanceAI — Architectural Changes from Original Plan

This document details key architectural decisions, scope boundaries, and pivots from initial exploratory designs to optimize for hackathon Round 2 judging.

---

## 1. Full In-Context Retrieval vs. Vector Embeddings
- **Original Plan**: Chunking brand guidelines into a vector database (e.g. Pinecone, Chroma, or MongoDB Atlas Vector Search) and retrieving the top-K relevant chunks via embedding similarity search before prompting the LLM.
- **Adopted Pivot**: In Round 2, all brand kit clauses (~20), facts (~8), and terminology rules (~10) are passed directly into Gemini's context window with explicit alphanumeric IDs (`G-01`, `F-02`, `TERM-01`).
- **Technical Justification**:
  1. **Zero Indexing Latency**: Updating, adding, or deleting a clause in the Brand Kit takes effect immediately with no embedding re-indexing overhead or vector pipeline failures.
  2. **Zero Semantic Retrieval Loss**: Vector search regularly misses nuanced negative guidelines (e.g. "Do not say X") because embedding distance does not naturally represent logical negation. Passing the entire brand kit guarantees 100% visibility.
  3. **Exact ID Citations**: Gemini can directly cross-reference every violation to its exact clause ID (`G-01`) or fact ID (`F-02`) with high precision.
  4. **Token Efficiency**: The entire brand kit consumes under 2,500 tokens, well within Gemini Flash's 1,000,000 token context window.

---

## 2. In-Memory Concurrency Limiter vs. External Job Queue
- **Original Plan**: Deploying an external Redis / BullMQ worker queue for background processing of AI reviews.
- **Adopted Pivot**: A lightweight in-memory async mutex queue inside Express manages concurrent Gemini requests on the free tier.
- **Technical Justification**:
  - Avoids requiring an external paid Redis service or complicated multi-container setup.
  - Keeps deployment strictly within the **single free Render Web Service** limit while completely preventing free-tier concurrent rate-limit errors.

---

## 3. Precomputed Seed Cache vs. Pure On-Demand Review
- **Original Plan**: Running all reviews dynamically on demand via live LLM calls.
- **Adopted Pivot**: All 3 seeded sample drafts are precomputed and cached in `ReviewCache` and `Finding` collections at seed time.
- **Technical Justification**:
  - Delivers an instantaneous "60-second try" experience for judges: when a judge opens any sample draft, findings and highlighted text spans render in **under 100ms**.
  - A prominent "Re-run for live review" button remains available if the judge wishes to trigger a live call.

---

## 4. Deferred Features (Reserved for Round 3)
Per the hackathon brief and product focus:
1. **Multimodal / Image Asset Review**:
   - Automated visual analysis of image pixels, color palettes, and logo spacing is deferred.
   - Handled currently via copy-level checks: validating descriptive alt text on image tags and ensuring image descriptions align with Clause G-12.
2. **Governance Insights & Analytics Dashboard**:
   - Cross-brand trend charts and department-wide compliance scorecards are deferred to focus strictly on the core author-to-reviewer decision loop.
3. **Enterprise Single Sign-On (SSO)**:
   - SAML / Okta / Azure AD integrations deferred in favor of zero-friction one-click demo logins for hackathon evaluation.
4. **Automated Evaluation Test Harness**:
   - Bulk benchmark suite deferred in favor of a lean, deterministic smoke-test script (`npm run smoke`) validating seeded drafts.
