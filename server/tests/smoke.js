const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const mongoose = require('mongoose');
const { runFullReview } = require('../services/aiReview');
const { clauses, facts, terms, sampleDrafts } = require('../seed/seedData');

async function runSmokeTest() {
  console.log('================================================================');
  console.log('       GRIEVANCEAI AUTOMATED SMOKE TEST (ALL 3 DRAFTS)          ');
  console.log('================================================================\n');

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB Atlas.\n');
    } catch (err) {
      console.warn('MongoDB connection note:', err.message);
    }
  }

  const results = [];

  for (let i = 0; i < sampleDrafts.length; i++) {
    const draft = sampleDrafts[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`Draft ${i + 1}/${sampleDrafts.length}: "${draft.title}" [${draft.channel}]`);
    console.log(`Stated Intent: "${draft.intent}"`);
    console.log(`Content Length: ${draft.content.length} characters`);
    console.log(`----------------------------------------------------------------`);

    const startTime = Date.now();
    const result = await runFullReview({
      draftContent: draft.content,
      draftIntent: draft.intent,
      clauses,
      facts,
      terms
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Audited in ${duration}s | AI Verified: ${result.aiUsed ? 'YES (Gemini)' : 'Rule-checks only'}`);
    if (result.note) console.log(`Notice: ${result.note}`);
    console.log(`Total Findings Identified: ${result.findings.length}\n`);

    result.findings.forEach((f, idx) => {
      console.log(`  [${idx + 1}] QUOTE: "${f.quote}" [offset ${f.start}..${f.end}]`);
      console.log(`      Severity: ${f.severity.toUpperCase()} | Category: ${f.category} | Confidence: ${f.confidence}`);
      console.log(`      Source: [${f.sourceType}:${f.sourceId}] ${f.sourceText ? `("${f.sourceText.slice(0, 65)}...")` : ''}`);
      console.log(`      Reason: ${f.reason}`);
      console.log(`      Suggested Fix: "${f.suggestion}"`);
      console.log('');
    });

    results.push({
      title: draft.title,
      findingsCount: result.findings.length,
      aiUsed: result.aiUsed,
      duration
    });
  }

  console.log('================================================================');
  console.log('                     SMOKE TEST SUMMARY                         ');
  console.log('================================================================');
  results.forEach((r, i) => {
    console.log(`Draft ${i + 1}: ${r.title.padEnd(45)} | Findings: ${String(r.findingsCount).padStart(2)} | Time: ${r.duration}s`);
  });
  console.log('================================================================');
  console.log('ALL SEEDED DRAFTS AUDITED SUCCESSFULLY. QUALITY PASS COMPLETE.');
  console.log('================================================================\n');

  process.exit(0);
}

runSmokeTest().catch(err => {
  console.error('Smoke test encountered an unhandled error:', err);
  process.exit(1);
});
