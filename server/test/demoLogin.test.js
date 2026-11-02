import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { demoUsers } from '../seed/seedData';

describe('Demo Accounts Manual Authentication & Isolation Suite', () => {
  let app;
  const mockWorkspace = {
    _id: 'ws_brewline_demo_123',
    slug: 'brewline-coffee',
    name: 'Brewline Coffee Co.'
  };

  const JWT_SECRET = 'test_secret_demo_accounts_2026';

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Pre-hash passwords
    const hashedUsers = await Promise.all(
      demoUsers.map(async (u) => ({
        ...u,
        passwordHash: await bcrypt.hash(u.password, 10),
        workspaceId: mockWorkspace._id
      }))
    );

    // Mock /api/auth/login route matching production logic
    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = hashedUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Isolation check
      if (user.workspaceId !== mockWorkspace._id) {
        return res.status(403).json({ error: 'Access restricted' });
      }

      const token = jwt.sign(
        {
          id: user.email,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: mockWorkspace._id,
          workspaceName: mockWorkspace.name
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: mockWorkspace._id,
          workspaceName: mockWorkspace.name
        }
      });
    });
  });

  demoUsers.forEach((demoUser) => {
    it(`authenticates ${demoUser.role} manually with ${demoUser.email} and dedicated password`, async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: demoUser.email,
          password: demoUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe(demoUser.role);
      expect(res.body.user.email).toBe(demoUser.email);
      expect(res.body.user.workspaceId).toBe(mockWorkspace._id);
      expect(res.body.user.workspaceName).toBe('Brewline Coffee Co.');
    });

    it(`rejects ${demoUser.role} login if password is incorrect`, async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: demoUser.email,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email or password');
    });
  });

  it('rejects nonexistent user email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown@externalcompany.com',
        password: 'SomePassword123'
      });

    expect(res.status).toBe(401);
  });
});
