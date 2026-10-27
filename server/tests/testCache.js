const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Draft, Finding, ReviewCache } = require('../models');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const drafts = await Draft.find();
  console.log(`Total drafts: ${drafts.length}`);
  for (const d of drafts) {
    const findings = await Finding.find({ draftId: d._id });
    console.log(`Draft "${d.title}" -> Precomputed Findings: ${findings.length}`);
  }
  const caches = await ReviewCache.find();
  console.log(`Total Precomputed Caches in MongoDB: ${caches.length}`);
  process.exit(0);
}
test();
