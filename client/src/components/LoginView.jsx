import React, { useState } from 'react';
import { 
  ShieldCheck, Sparkles, User, UserCheck, Settings, 
  ArrowRight, CheckCircle2, Coffee, Clock, Zap, FileText 
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState(null);

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
            <span>Click <strong>"Try as Creator"</strong> below</span>
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

      {/* Preloaded Demo Environment Footer */}
      <div className="demo-footer">
        <Coffee size={16} /> Preloaded workspace: <strong>Brewline Coffee Co.</strong> with 20 brand clauses, 8 verified facts, 10 terminology rules, and 3 sample drafts with seeded errors.
      </div>
    </div>
  );
}
