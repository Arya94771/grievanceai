import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, BookOpen, LogOut, User, 
  RotateCcw, Sparkles, AlertCircle, CheckCircle, RefreshCw 
} from 'lucide-react';
import LoginView from './components/LoginView';
import DraftsListView from './components/DraftsListView';
import ReviewView from './components/ReviewView';
import BrandKitView from './components/BrandKitView';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('grievance_token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('grievance_user') ? JSON.parse(localStorage.getItem('grievance_user')) : null
  );

  const [currentView, setCurrentView] = useState('drafts'); // 'drafts' | 'review' | 'brand-kit'
  const [selectedDraftId, setSelectedDraftId] = useState(null);

  useEffect(() => {
    if (token) {
      // Validate session
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Session invalid');
          return res.json();
        })
        .then(data => setUser(data.user))
        .catch(() => handleLogout());
    }
  }, [token]);

  function handleLoginSuccess(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('grievance_token', newToken);
    localStorage.setItem('grievance_user', JSON.stringify(newUser));
    setCurrentView('drafts');
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setSelectedDraftId(null);
    localStorage.removeItem('grievance_token');
    localStorage.removeItem('grievance_user');
  }

  // Quick Role Switcher for Judges (no relogin required)
  async function handleSwitchRole(role) {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        handleLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  }

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="top-navbar">
        <div className="nav-brand" onClick={() => { setSelectedDraftId(null); setCurrentView('drafts'); }} style={{ cursor: 'pointer' }}>
          <ShieldCheck size={22} className="text-primary" />
          <span>GrievanceAI</span>
          <span className="brand-badge">{user.workspaceName || 'Brewline Coffee Co.'}</span>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-btn ${currentView === 'drafts' && !selectedDraftId ? 'active' : ''}`}
            onClick={() => { setSelectedDraftId(null); setCurrentView('drafts'); }}
          >
            <FileText size={16} /> Drafts &amp; Compliance
          </button>
          <button 
            className={`nav-btn ${currentView === 'brand-kit' ? 'active' : ''}`}
            onClick={() => { setSelectedDraftId(null); setCurrentView('brand-kit'); }}
          >
            <BookOpen size={16} /> Brand Kit &amp; Rules
          </button>
        </nav>

        <div className="nav-user">
          {/* One-Click Role Switcher Dropdown */}
          <div className="user-role-switcher">
            <span className="text-sm text-muted">Role:</span>
            <select
              className="role-select"
              value={user.role}
              onChange={(e) => handleSwitchRole(e.target.value)}
              title="One-click switch role as a judge"
            >
              <option value="creator">Creator (Aarav)</option>
              <option value="manager">Manager (Maya)</option>
              <option value="reviewer">Reviewer (Rohan)</option>
              <option value="admin">Admin (Priya)</option>
            </select>
          </div>

          <button className="icon-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="main-content">
        {selectedDraftId ? (
          <ReviewView
            draftId={selectedDraftId}
            token={token}
            user={user}
            onBack={() => setSelectedDraftId(null)}
          />
        ) : currentView === 'drafts' ? (
          <DraftsListView
            token={token}
            user={user}
            onSelectDraft={(id) => setSelectedDraftId(id)}
          />
        ) : (
          <BrandKitView
            token={token}
            user={user}
          />
        )}
      </main>
    </div>
  );
}
