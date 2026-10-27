const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const mongoose = require('mongoose');
const { runFullReview, redactPII } = require('../services/aiReview');
const { clauses, facts, terms, sampleDrafts } = require('../seed/seedData');
const { AiUseLog } = require('../models');

async function testReview() {
  console.log('Testing PII redaction...');
  const testPII = 'Contact me at john.doe@brewline.com or call +91 98765 43210 for orders.';
  const { redactedText, redactions } = redactPII(testPII);
  console.log('Original:', testPII);
  console.log('Redacted:', redactedText);
  console.log('Redactions:', redactions);

  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('\nTesting live AI Review on Sample Draft 1 (Monsoon Roast)...');
  const draft = sampleDrafts[0];
  console.log('Draft Title:', draft.title);

  const startTime = Date.now();
  const reviewResult = await runFullReview({
    draftContent: draft.content,
    draftIntent: draft.intent,
    clauses,
    facts,
    terms
  });
  const duration = Date.now() - startTime;

  console.log(`Review finished in ${duration}ms. AI Used: ${reviewResult.aiUsed}`);
  if (reviewResult.note) console.log('Note:', reviewResult.note);
  console.log(`Total Findings: ${reviewResult.findings.length}`);

  reviewResult.findings.forEach((f, idx) => {
    console.log(`\n[${idx + 1}] "${f.quote}" [${f.start}..${f.end}]`);
    console.log(`    Category: ${f.category} | Severity: ${f.severity} | Confidence: ${f.confidence}`);
    console.log(`    Source: [${f.sourceType}:${f.sourceId}] ${f.sourceText ? `("${f.sourceText.slice(0, 60)}...")` : ''}`);
    console.log(`    Reason: ${f.reason}`);
    console.log(`    Suggested Fix: "${f.suggestion}"`);
  });

  const logs = await AiUseLog.find().sort({ timestamp: -1 }).limit(1);
  if (logs.length > 0) {
    console.log('\nAiUseLog recorded successfully: Model =', logs[0].model);
  }

  process.exit(0);
}

testReview().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
