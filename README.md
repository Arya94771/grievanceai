# GrievanceAI

**GrievanceAI** is an AI-powered brand-governance and content compliance platform built for the hackathon (Round 2).

> **Core Philosophy**: Content goes in &rarr; verified against approved brand guidelines, terminology, facts, and assets &rarr; issues surfaced with exact source attribution &rarr; a human decides &rarr; a manager/reviewer approves. AI only suggests; nothing changes without an explicit human click.

---

## Architecture Overview
- **Frontend**: React (Vite), Single Page Application with tailored role views (Creator, Manager, Reviewer, Admin), high-contrast accessible UI, and live diff reviewers.
- **Backend**: Node.js + Express REST API serving the React application in production (zero CORS issues, unified URL).
- **Database**: MongoDB Atlas with Mongoose ODM.
- **AI Engine**: Google Gemini API (`gemini-1.5-flash`) with structured JSON schema outputs, server-side claim verification, and strict quote/source matching.
- **Rules Engine**: Fast deterministic offline rule checker for banned terms, casing, excessive punctuation, and accessibility patterns.

---

## Repository Structure
```
grievanceai/
├── client/           # React frontend (Vite)
│   ├── src/          # Components, views, context, styles
│   └── package.json
├── server/           # Express backend
│   ├── models/       # Mongoose data models
│   ├── routes/       # Express API routes
│   ├── services/     # Exact rule engine & Gemini verification
│   ├── seed/         # Brewline Coffee Co. demo data
│   ├── index.js      # Main server entrypoint
│   └── package.json
├── docs/             # Technical specifications & disclosures
│   ├── FEATURES.md
│   ├── TECH.md
│   ├── CHANGES.md
│   └── AI-DISCLOSURE.md
├── .gitignore
├── package.json      # Root orchestrator
└── README.md
```

---

## Local Development Quickstart

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Arya94771/grievanceai.git
   cd grievanceai
   ```

2. **Configure Environment Variables**:
   Copy `server/.env.example` to `server/.env` and populate:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-1.5-flash`
   - `JWT_SECRET`
   - `PORT=5000`

3. **Install Dependencies & Build**:
   ```bash
   npm run build
   ```

4. **Start Application**:
   ```bash
   npm start
   ```
   Visit `http://localhost:5000` in your browser.
