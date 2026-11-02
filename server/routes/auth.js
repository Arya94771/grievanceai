const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Workspace } = require('../models');
const { seedBrewlineWorkspace } = require('../seed/seeder');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// One-click demo login endpoint for Judges/Users
router.post('/demo-login', async (req, res) => {
  try {
    const { role = 'creator' } = req.body;
    const allowedRoles = ['creator', 'manager', 'reviewer', 'admin'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid demo role. Allowed: ${allowedRoles.join(', ')}` });
    }

    // Ensure Brewline workspace exists
    let workspace = await Workspace.findOne({ slug: 'brewline-coffee' });
    let user = await User.findOne({ role, email: `${role}@brewline.com` });

    if (!workspace || !user) {
      console.log('[Auth] Seeding workspace on demand for demo login...');
      const seedResult = await seedBrewlineWorkspace();
      workspace = seedResult.workspace;
      user = seedResult.userMap[role];
    }

    if (!user) {
      return res.status(404).json({ error: `Demo user for role ${role} could not be resolved.` });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: workspace._id,
        workspaceName: workspace.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: workspace._id,
        workspaceName: workspace.name
      }
    });
  } catch (err) {
    console.error('[Demo Login Error]:', err);
    res.status(500).json({ error: 'Failed to process demo login', details: err.message });
  }
});

// Standard email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    // If user not found and this is a recognized demo account email, auto-seed/ensure Brewline demo workspace
    const demoEmails = ['creator@brewline.com', 'manager@brewline.com', 'reviewer@brewline.com', 'admin@brewline.com'];
    if (!user && demoEmails.includes(cleanEmail)) {
      console.log(`[Auth] Auto-seeding workspace on demand for demo account login: ${cleanEmail}`);
      await seedBrewlineWorkspace();
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const workspace = await Workspace.findById(user.workspaceId);

    // Security check: demo accounts must strictly belong only to their demo workspace
    if (demoEmails.includes(cleanEmail) && workspace && workspace.slug !== 'brewline-coffee') {
      return res.status(403).json({ error: 'Access restricted: demo credentials permitted only for fictional demo workspace.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace ? workspace.name : 'GrievanceAI'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace ? workspace.name : 'GrievanceAI'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login error', details: err.message });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const workspace = await Workspace.findById(user.workspaceId);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace ? workspace.name : 'Brewline Coffee Co.'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;
