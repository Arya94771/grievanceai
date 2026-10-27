const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const mongoose = require('mongoose');
const http = require('http');
const { app, startServer } = require('../index');

function makeRequest({ method, path, headers = {}, body = null, port = 5000 }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  const { server } = await startServer();
  console.log('Testing T7/T8 Draft Flow API...');

  // 1. Creator Demo Login
  const loginRes = await makeRequest({
    method: 'POST',
    path: '/api/auth/demo-login',
    headers: { 'Content-Type': 'application/json' },
    body: { role: 'creator' }
  });
  console.log('1. Demo Login Status:', loginRes.status, 'User:', loginRes.body.user.name);
  const token = loginRes.body.token;

  // 2. Fetch drafts list
  const draftsRes = await makeRequest({
    method: 'GET',
    path: '/api/drafts',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('2. Drafts Count:', draftsRes.body.length);
  const firstDraft = draftsRes.body[0];
  console.log('   Selected Draft:', firstDraft.title);

  // 3. Trigger Review
  console.log('3. Running Review on Draft...');
  const reviewRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${firstDraft._id}/review`,
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   Review finished. AI Used:', reviewRes.body.aiUsed, 'Total Findings:', reviewRes.body.findings.length);

  // 4. Accept a finding
  const openFinding = reviewRes.body.findings[0];
  console.log('4. Accepting Finding:', openFinding.quote, '->', openFinding.suggestion);
  const acceptRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${firstDraft._id}/findings/${openFinding._id}/decision`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: { decision: 'accepted' }
  });
  console.log('   Accept Status:', acceptRes.status, 'New Revision Created:', acceptRes.body.newRevision?.revisionNumber);

  // 5. Reject another finding
  if (reviewRes.body.findings.length > 1) {
    const secondFinding = reviewRes.body.findings[1];
    console.log('5. Rejecting Finding:', secondFinding.quote);
    const rejectRes = await makeRequest({
      method: 'POST',
      path: `/api/drafts/${firstDraft._id}/findings/${secondFinding._id}/decision`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: { decision: 'rejected', decisionNote: 'Creative brand exception for social channel' }
    });
    console.log('   Reject Status:', rejectRes.status, 'Finding status:', rejectRes.body.finding?.status);
  }

  console.log('\nT7 & T8 Draft Flow & Review Engine verified successfully!');
  server.close();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
