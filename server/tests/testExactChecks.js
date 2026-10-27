const { runExactChecks } = require('../services/exactChecks.js');
const { terms, sampleDrafts } = require('../seed/seedData.js');

console.log('Testing Exact Checks Engine across sample drafts...');

sampleDrafts.forEach((draft, idx) => {
  console.log(`\n--- Draft ${idx + 1}: ${draft.title} ---`);
  const findings = runExactChecks(draft.content, terms);
  console.log(`Findings count: ${findings.length}`);
  findings.forEach(f => {
    console.log(`  * [${f.sourceType}:${f.sourceId}] (${f.severity}) Quote: "${f.quote}" -> "${f.suggestion}" [${f.start}..${f.end}]`);
  });
});
