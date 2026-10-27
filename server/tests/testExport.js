const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const { startServer } = require('../index');

async function testExport() {
  const { server } = await startServer();

  // Login
  const loginRes = await new Promise(r => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/auth/demo-login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    });
    req.write(JSON.stringify({ role: 'creator' })); req.end();
  });

  // Get drafts
  const drafts = await new Promise(r => {
    http.get('http://localhost:5000/api/drafts?token=' + loginRes.token, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    });
  });

  const draft = drafts[0];

  // Test HTML export
  const htmlExport = await new Promise(r => {
    http.get('http://localhost:5000/api/drafts/' + draft._id + '/export?format=html&token=' + loginRes.token, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r({ status: res.statusCode, length: d.length }));
    });
  });
  console.log('HTML Export Status:', htmlExport.status, 'Payload Length:', htmlExport.length, 'bytes');

  // Test Markdown export
  const mdExport = await new Promise(r => {
    http.get('http://localhost:5000/api/drafts/' + draft._id + '/export?format=markdown&token=' + loginRes.token, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r({ status: res.statusCode, length: d.length }));
    });
  });
  console.log('Markdown Export Status:', mdExport.status, 'Payload Length:', mdExport.length, 'bytes');

  console.log('\nT16 Report Export tested successfully!');
  server.close();
  process.exit(0);
}
testExport().catch(err => {
  console.error(err);
  process.exit(1);
});
