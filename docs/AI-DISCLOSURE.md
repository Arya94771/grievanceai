# GrievanceAI — AI Disclosure & Usage Policy

Transparency is a core value of GrievanceAI. This disclosure outlines both how AI was utilized to construct this application and how AI operates within the runtime product.

---

## 1. AI Tools Used to Build the Application

- **Development Assistant**: Google Antigravity paired with DeepMind Advanced Agentic Coding.
- **Architectural Scaffolding**: Agentic assistance utilized for Mongoose schema design, React component architecture, accessibility color contrast compliance, and full-stack integration scripts.
- **Verification & Testing**: Automated test generation for deterministic rule testing (`testExactChecks.js`), live draft flow testing (`testDraftFlow.js`), approval workflow validation (`testApprovalWorkflow.js`), and smoke testing (`smoke.js`).

---

## 2. Gemini Usage in the Runtime Product

### Core Philosophy
> **"AI only suggests; nothing changes without a human click."**
> GrievanceAI strictly prevents AI from automatically mutating draft collateral or publishing content. The human creator and manager retain 100% agency.

### Model & API Configuration
- **Model**: Google Gemini `gemini-3.5-flash-lite` (via official `@google/generative-ai` SDK).
- **Execution Mode**: Structured JSON Output (`responseMimeType: "application/json"`).
- **In-Context Prompting**: The active brand guidelines, verified facts, approved terminology, and author's stated intent are passed into the prompt.
- **PII Privacy**: All email addresses and phone numbers are redacted client-side / server-side before transmission to Google AI Studio.
- **Server-Side Verifier Guardrail**: Quotes and source IDs emitted by Gemini are deterministically checked by the Node.js server before display. If a quote is not found verbatim in the source text, it is dropped or downgraded to unverified.
- **Audit Transparency**: Every call made to the Gemini API is logged in the `AiUseLog` collection, recording the model version, payload summary, token estimates, and redactions applied.
