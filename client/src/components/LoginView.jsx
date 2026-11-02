import React, { useState } from 'react';
import { 
  ShieldCheck, Sparkles, User, UserCheck, Settings, 
  ArrowRight, CheckCircle2, Coffee, Clock, Zap, FileText,
  Copy, Check, Key, LogIn, Info
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState(null);

  // Manual login state
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Copy state tracker
  const [copiedKey, setCopiedKey] = useState(null);

  const demoAccounts = [
    {
      role: 'Creator',
      name: 'Aarav Mehta',
      email: 'creator@brewline.com',
      password: 'BrewlineDemo2026!Creator',
      description: 'Drafts copy, uploads creatives, reviews AI findings & suggestions'
    },
    {
      role: 'Manager',
      name: 'Maya Sen',
      email: 'manager@brewline.com',
      password: 'BrewlineDemo2026!Manager',
      description: 'Reviews submitted drafts, requests changes, executes approved overrides'
    },
    {
      role: 'Reviewer',
      name: 'Rohan Deshmukh',
      email: 'reviewer@brewline.com',
      password: 'BrewlineDemo2026!Reviewer',
      description: 'Conducts compliance audits, verifies claims, inspects evidence crops'
    },
    {
      role: 'Admin',
      name: 'Priya Sharma',
      email: 'admin@brewline.com',
      password: 'BrewlineDemo2026!Admin',
      description: 'Full workspace control, brand kit custody, logo uploads, palette rules'
    }
  ];

  async function handleDemoLogin(role) {
    try {
      setLoadingRole(role);
      setError(null);

      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRole(null);
    }
  }

  async function handleManualLogin(e) {
    e.preventDefault();
    if (!manualEmail || !manualPassword) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setManualLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail, password: manualPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setManualLoading(false);
    }
  }

  function handleCopy(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  }

  function fillCredentials(email, password) {
    setManualEmail(email);
    setManualPassword(password);
  }

  return (
    <div className="login-screen">
      {/* Hero Section */}
      <div className="login-hero">
        <div className="login-badge">
          <ShieldCheck size={16} /> Autonomous Brand-Governance Platform
        </div>
        <h1 className="login-title">
          Grievance<span className="text-primary">AI</span>
        </h1>
        <p className="login-tagline">
          Content goes in &rarr; checked against approved guidelines, facts & terminology &rarr; issues surfaced with exact source attribution &rarr; a human decides &rarr; manager approves.
        </p>
        <p className="login-subtagline">
          AI only suggests; nothing changes without an explicit human click.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* 60-Second Try Panel */}
      <div className="quick-try-card">
        <div className="quick-try-header">
          <Clock size={18} className="text-primary" />
          <h3>Judge's 60-Second Walkthrough</h3>
        </div>
        <div className="quick-try-steps">
          <div className="try-step">
            <span className="step-num">1</span>
            <span>Click <strong>"Try as Creator"</strong> below or use demo credentials</span>
          </div>
          <div className="try-step">
            <span className="step-num">2</span>
            <span>Open sample draft &amp; click <strong>"Run Review"</strong></span>
          </div>
          <div className="try-step">
            <span className="step-num">3</span>
            <span>Click <strong>"Accept"</strong> on one fix and <strong>"Reject"</strong> on another</span>
          </div>
          <div className="try-step">
            <span className="step-num">4</span>
            <span>Submit for Review, switch to <strong>Manager</strong>, and <strong>Approve</strong></span>
          </div>
        </div>
      </div>

      {/* One-Click Role Login Cards */}
      <div className="roles-grid">
        {/* Creator */}
        <div className="role-card" onClick={() => handleDemoLogin('creator')}>
          <div className="role-icon icon-creator">
            <User size={24} />
          </div>
          <h3 className="role-title">Try as Creator</h3>
          <p className="role-desc">
            Aarav Mehta &bull; Draft marketing copy, paste text, upload documents, review AI findings, and accept/reject suggestions.
          </p>
          <button 
            className="btn btn-primary role-btn"
            disabled={loadingRole !== null}
          >
            {loadingRole === 'creator' ? 'Logging in...' : 'Enter as Creator'} <ArrowRight size={15} />
          </button>
        </div>

        {/* Manager */}
        <div className="role-card" onClick={() => handleDemoLogin('manager')}>
          <div className="role-icon icon-manager">
            <UserCheck size={24} />
          </div>
          <h3 className="role-title">Try as Manager</h3>
          <p className="role-desc">
            Maya Sen &bull; Review submitted drafts, request revisions with feedback, override rules if justified, and approve publication.
          </p>
          <button 
            className="btn btn-primary role-btn"
            disabled={loadingRole !== null}
          >
            {loadingRole === 'manager' ? 'Logging in...' : 'Enter as Manager'} <ArrowRight size={15} />
          </button>
        </div>

        {/* Reviewer */}
        <div className="role-card" onClick={() => handleDemoLogin('reviewer')}>
          <div className="role-icon icon-reviewer">
            <Sparkles size={24} />
          </div>
          <h3 className="role-title">Try as Reviewer</h3>
          <p className="role-desc">
            Rohan Deshmukh &bull; Quality & legal compliance officer. Audit brand claims, verify citations, and participate in discussion threads.
          </p>
          <button 
            className="btn btn-primary role-btn"
            disabled={loadingRole !== null}
          >
            {loadingRole === 'reviewer' ? 'Logging in...' : 'Enter as Reviewer'} <ArrowRight size={15} />
          </button>
        </div>

        {/* Admin */}
        <div className="role-card" onClick={() => handleDemoLogin('admin')}>
          <div className="role-icon icon-admin">
            <Settings size={24} />
          </div>
          <h3 className="role-title">Try as Admin</h3>
          <p className="role-desc">
            Priya Sharma &bull; Brand Kit custodian. Add/edit brand clauses, manage facts, ban terminology, and use "Paste Guidelines" auto-split.
          </p>
          <button 
            className="btn btn-primary role-btn"
            disabled={loadingRole !== null}
          >
            {loadingRole === 'admin' ? 'Logging in...' : 'Enter as Admin'} <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Demo Accounts Card & Manual Login */}
      <div style={{ maxWidth: '960px', margin: '24px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Demo Accounts Listing Card */}
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Key size={18} className="text-primary" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: '#1B4332' }}>Demo Accounts</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 16px', lineHeight: '1.4' }}>
            Demo workspace uses fictional data (Brewline Coffee Co.). Changes reset every 6 hours.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {demoAccounts.map((acc) => (
              <div 
                key={acc.role}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: '#F8FAFC', 
                  border: '1px solid #E2E8F0',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ color: '#0F172A', fontSize: '0.9rem' }}>{acc.role} ({acc.name})</strong>
                  <button
                    type="button"
                    onClick={() => fillCredentials(acc.email, acc.password)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2D6A4F',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#E8F5E9'
                    }}
                    title="Populate manual login form"
                  >
                    Use in Form &darr;
                  </button>
                </div>

                {/* Email row with copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                  <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' }}>{acc.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(acc.email, `${acc.role}-email`)}
                    className="btn btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', height: 'auto' }}
                    title="Copy Email"
                  >
                    {copiedKey === `${acc.role}-email` ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === `${acc.role}-email` ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Password row with copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {acc.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(acc.password, `${acc.role}-pass`)}
                    className="btn btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', height: 'auto' }}
                    title="Copy Password"
                  >
                    {copiedKey === `${acc.role}-pass` ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === `${acc.role}-pass` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Email/Password Login Form */}
        <div className="card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <LogIn size={18} className="text-primary" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: '#1B4332' }}>Manual Account Login</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 18px', lineHeight: '1.4' }}>
            Sign in manually using any of the demo account credentials or an existing workspace user.
          </p>

          <form onSubmit={handleManualLogin}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. creator@brewline.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={manualLoading}
              style={{ width: '100%', padding: '10px', fontSize: '0.95rem', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {manualLoading ? 'Authenticating...' : 'Sign In with Credentials'} <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '20px', padding: '12px', borderRadius: '6px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Info size={16} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: '1.4' }}>
              Demo accounts reach only the fictional demo workspace. No real user data or environment variables are accessible.
            </span>
          </div>
        </div>

      </div>

      {/* Preloaded Demo Environment Footer */}
      <div className="demo-footer" style={{ marginTop: '24px' }}>
        <Coffee size={16} /> Preloaded workspace: <strong>Brewline Coffee Co.</strong> with 20 brand clauses, 8 verified facts, 10 terminology rules, and 3 sample drafts with seeded errors.
      </div>
    </div>
  );
}
