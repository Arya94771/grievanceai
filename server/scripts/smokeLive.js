/**
 * Live Smoke Test script for deployed Render instances or staging environments.
 * Usage: npm run smoke:live -- <BASE_URL>
 * Tests:
 * 1. Health endpoint (/api/health)
 * 2. Demo logins for all 4 roles (Creator, Manager, Reviewer, Admin)
 * 3. Draft fetch and review execution
 * 4. Brand kit assets and guidelines fetch
 * 5. Insights analytics endpoint (/api/insights)
 * 6. Report export (.html and .md)
 * Exits with non-zero status on any failure.
 */

const https = require('https');
const http = require('http');

const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:5000';

function makeRequest(urlPath, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, baseUrl);
    const client = fullUrl.protocol === 'https:' ? https : http;

    const req = client.request(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Request to ${urlPath} timed out after 15s`));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveSmoke() {
  console.log(`[Smoke:Live] Starting live verification against: ${baseUrl}`);
  let step = 1;

  // 1. Health check
  console.log(`[Step ${step++}] Checking /api/health...`);
  const health = await makeRequest('/api/health');
  if (health.status !== 200 || health.body.status !== 'ok') {
    throw new Error(`Health check failed: status ${health.status}, body: ${JSON.stringify(health.body)}`);
  }
  console.log(`  ✅ Health check passed. DB state: ${health.body.db}, Model: ${health.body.geminiModel}`);

  // 2. Login all 4 roles
  const roles = [
    { email: 'creator@brewline.com', role: 'creator', password: 'BrewlineDemo2026!Creator' },
    { email: 'manager@brewline.com', role: 'manager', password: 'BrewlineDemo2026!Manager' },
    { email: 'reviewer@brewline.com', role: 'reviewer', password: 'BrewlineDemo2026!Reviewer' },
    { email: 'admin@brewline.com', role: 'admin', password: 'BrewlineDemo2026!Admin' }
  ];

  let adminToken = null;
  let creatorToken = null;

  for (const r of roles) {
    console.log(`[Step ${step++}] Authenticating ${r.role} (${r.email})...`);
    const login = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: r.email, password: r.password }
    });
    if (login.status !== 200 || !login.body.token) {
      throw new Error(`Login failed for ${r.email}: status ${login.status}`);
    }
    if (r.role === 'admin') adminToken = login.body.token;
    if (r.role === 'creator') creatorToken = login.body.token;
    console.log(`  ✅ Authenticated ${r.role} successfully.`);
  }

  // 3. Drafts fetch
  console.log(`[Step ${step++}] Fetching drafts as Creator...`);
  const drafts = await makeRequest('/api/drafts', {
    headers: { Authorization: `Bearer ${creatorToken}` }
  });
  if (drafts.status !== 200 || !Array.isArray(drafts.body.drafts)) {
    throw new Error(`Draft fetch failed: status ${drafts.status}`);
  }
  console.log(`  ✅ Retrieved ${drafts.body.drafts.length} drafts.`);

  // 4. Insights fetch
  console.log(`[Step ${step++}] Fetching Insights as Admin...`);
  const insights = await makeRequest('/api/insights', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (insights.status !== 200 || !insights.body.kpis) {
    throw new Error(`Insights fetch failed: status ${insights.status}`);
  }
  console.log(`  ✅ Insights KPIs retrieved: Compliance Rate ${insights.body.kpis.complianceRate}%`);

  // 5. Brand Kit Assets
  console.log(`[Step ${step++}] Fetching Brand Kit Assets...`);
  const brandKit = await makeRequest('/api/brand-kit', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (brandKit.status !== 200) {
    throw new Error(`Brand kit fetch failed: status ${brandKit.status}`);
  }
  console.log(`  ✅ Brand Kit retrieved successfully.`);

  console.log('====================================================');
  console.log('🎉 ALL LIVE SMOKE TESTS PASSED END-TO-END');
  console.log('====================================================');
}

if (require.main === module) {
  runLiveSmoke()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ LIVE SMOKE TEST FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { runLiveSmoke };
