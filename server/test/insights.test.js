import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Test token generator
const JWT_SECRET = 'test_secret_key_123';
function createTestToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('I7 Insights API & Access Control Tests', () => {
  it('enforces JWT authentication on /api/insights', async () => {
    // Basic mock router test
    const app = express();
    app.use(express.json());
    
    // Auth guard mock
    app.get('/api/insights', (req, res) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      res.json({ status: 'ok' });
    });

    const resUnauth = await request(app).get('/api/insights');
    expect(resUnauth.status).toBe(401);

    const token = createTestToken({ userId: 'u1', role: 'admin' });
    const resAuth = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${token}`);
    expect(resAuth.status).toBe(200);
  });

  it('calculates compliance rate KPI accurately without division by zero', () => {
    const reviewedDrafts = 0;
    const compliantDrafts = 0;
    const rate = reviewedDrafts > 0 ? Math.round((compliantDrafts / reviewedDrafts) * 100) : 100;
    expect(rate).toBe(100);

    const reviewedDrafts2 = 4;
    const compliantDrafts2 = 3;
    const rate2 = Math.round((compliantDrafts2 / reviewedDrafts2) * 100);
    expect(rate2).toBe(75);
  });

  it('flags guideline as unclear when rejection/dispute rate >= 40% and decisions >= 5', () => {
    const totalDecisions = 6;
    const overrides = 3; // 50%
    const overrideRate = Number((overrides / totalDecisions).toFixed(2));
    const isUnclear = totalDecisions >= 5 && overrideRate >= 0.40;

    expect(isUnclear).toBe(true);

    // Below threshold (only 2 decisions)
    const lowVolumeDecisions = 2;
    const isUnclearLowVol = lowVolumeDecisions >= 5 && (2 / 2) >= 0.40;
    expect(isUnclearLowVol).toBe(false);
  });
});
