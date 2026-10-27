const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

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

async function runApprovalTest() {
  const { server } = await startServer();
  console.log('Testing T9 Approval Workflow & Blocking Mechanism...');

  // 1. Creator Login & fetch draft
  const creatorLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/demo-login',
    headers: { 'Content-Type': 'application/json' },
    body: { role: 'creator' }
  });
  const creatorToken = creatorLogin.body.token;

  const draftsRes = await makeRequest({
    method: 'GET',
    path: '/api/drafts',
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  });
  const sampleDraft = draftsRes.body.find(d => d.title.includes('Monsoon Roast')) || draftsRes.body[0];
  console.log('Selected Draft:', sampleDraft.title, 'Status:', sampleDraft.status);

  // 2. Submit for review
  const submitRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${sampleDraft._id}/submit`,
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  });
  console.log('2. Submit for review status:', submitRes.status, 'New Draft Status:', submitRes.body.draft?.status);

  // 3. Manager Login
  const managerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/demo-login',
    headers: { 'Content-Type': 'application/json' },
    body: { role: 'manager' }
  });
  const managerToken = managerLogin.body.token;

  // 4. Ensure findings are present by running review
  await makeRequest({
    method: 'POST',
    path: `/api/drafts/${sampleDraft._id}/review`,
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });

  // 5. Attempt direct approval (should be BLOCKED because open clear findings exist)
  console.log('5. Manager attempts direct approval without resolving clear violations...');
  const directApproveRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${sampleDraft._id}/approve`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: {}
  });

  console.log('   Direct Approve Result:', directApproveRes.status, directApproveRes.body.error);
  if (directApproveRes.body.error === 'APPROVAL_BLOCKED') {
    console.log('   SUCCESS: Approval was strictly BLOCKED as required! Blocked clear count:', directApproveRes.body.openClearCount);
  } else {
    throw new Error('Approval blocking failed!');
  }

  // 6. Approve with override reason
  console.log('6. Manager approves with explicit override justification...');
  const overrideRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${sampleDraft._id}/approve`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: { overrideReason: 'Approved for limited internal brand pilot campaign.' }
  });
  console.log('   Override Approval Result:', overrideRes.status, overrideRes.body.message, 'Draft status:', overrideRes.body.draft?.status);

  // 7. Request changes test on another draft
  const secondDraft = draftsRes.body.find(d => d._id !== sampleDraft._id);
  console.log('7. Testing Request Changes on draft:', secondDraft.title);
  const reqChangesRes = await makeRequest({
    method: 'POST',
    path: `/api/drafts/${secondDraft._id}/request-changes`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    },
    body: { comment: 'Please tone down the superlatives and clarify the tour dates.' }
  });
  console.log('   Request Changes Result:', reqChangesRes.status, 'New Status:', reqChangesRes.body.draft?.status);

  console.log('\nT9 Approval Workflow verified successfully!');
  server.close();
  process.exit(0);
}

runApprovalTest().catch(err => {
  console.error('Approval test failed:', err);
  process.exit(1);
});
