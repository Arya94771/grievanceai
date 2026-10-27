# GrievanceAI

**GrievanceAI** is an autonomous brand-governance and content compliance platform engineered for the hackathon (Round 2).

> **Core Philosophy**: Content goes in &rarr; verified against approved brand guidelines, terminology, facts, and assets &rarr; issues surfaced with exact source attribution &rarr; a human decides &rarr; a manager/reviewer approves. AI only suggests; nothing changes without an explicit human click.

---

## ⚡ 60-Second Demo Walkthrough for Judges

Judges can test the entire value loop in under 60 seconds with **zero signup**:

1. **Open the live application URL**.
2. **Click "Try as Creator"** on the home screen (logs in as Aarav Mehta).
3. **Select Sample Draft 1**: *"Monsoon Roast Social Announcement"*.
4. **Click "Run Review"**:
   - The dual-engine auditor triggers: exact rule checks run instantly, and Gemini verifies tone, terminology, and claims against Brewline brand guidelines.
   - 8–9 issues are flagged with verbatim text highlights, category badges, and source citations (e.g. `Clause G-15`, `Fact F-02`, `Term Banned`).
5. **Accept a fix**: Click **"Accept Fix"** on the price contradiction (changes `₹199` to `₹499` matching Fact F-02). Notice that Revision #2 is automatically created and draft text updates in real-time.
6. **Reject a fix**: Click **"Reject"** on another issue with an optional rationale.
7. **Submit for review**: Click **"Submit for Review"** (draft transitions to `in_review`).
8. **Switch role**: In the top navigation, change the role dropdown from **Creator** to **Manager** (Maya Sen).
9. **Review & Approve**:
   - Notice that if any `clear` violations remain open, direct approval is **strictly blocked** by compliance policy.
   - Click **"Approve"** and supply a documented override reason, or click **"Request Changes"** to send feedback back to the creator.
   - Visit the **"Revisions & Audit Trail"** tab to view the side-by-side diff and immutable activity timeline.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19 (Vite) Single Page Application with tailored role views, accessible color contrast, and interactive span highlights.
- **Backend**: Node.js + Express REST API configured as a unified monolith. In production, Express directly serves the compiled Vite assets from `/client/dist` (zero CORS issues).
- **Database**: MongoDB Atlas M0 cluster via Mongoose.
- **AI Engine**: Google Gemini API (`gemini-3.5-flash-lite`) with structured JSON schema outputs.
- **Offline Rules Engine**: Fast deterministic regex and boundary-matching scanner for banned terms, casing, excessive punctuation, and WCAG link text.
- **Document Ingestion**: Multi-format extraction supporting `.txt`, `.docx` (via `mammoth`), and `.pdf` (via `pdf-parse`).
- **Security & Privacy**: Client/server PII redaction (emails and phone numbers), JWT authentication with role-based route guards, and strict environment variable isolation.

---

## 🚀 Local Development Quickstart

### Prerequisites
- Node.js v18+ and npm
- A MongoDB Atlas connection string (or local MongoDB instance)
- A Google AI Studio Gemini API key

### 1. Clone the repository
```bash
git clone https://github.com/Arya94771/grievanceai.git
cd grievanceai
```

### 2. Configure Environment Variables
Copy `server/.env.example` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Populate the required values:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
JWT_SECRET=your_jwt_signing_secret
```

### 3. Build & Run Application
```bash
# Install all dependencies and build client bundle
npm run build

# Start the unified server
npm start
```
Access the application at `http://localhost:5000`.

### 4. Run Automated Smoke Test
To verify the review engine across all 3 seeded drafts:
```bash
npm run smoke
```

---

## 📖 Technical Documentation

- **[Features Specification](docs/FEATURES.md)**: Detailed breakdown of all implemented capabilities.
- **[Technical Architecture](docs/TECH.md)**: Architecture diagrams, Gemini integration, server-side verifier design, and data schema.
- **[Architectural Changes & Pivots](docs/CHANGES.md)**: Explanation of why in-context retrieval replaced vector embeddings for Round 2 scale.
- **[AI & Privacy Disclosure](docs/AI-DISCLOSURE.md)**: Transparency disclosure on tools used to build GrievanceAI and runtime AI behaviors.
