import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, BookOpen, LogOut, User, 
  RotateCcw, Sparkles, AlertCircle, CheckCircle, RefreshCw, BarChart3 
} from 'lucide-react';
import LoginView from './components/LoginView';
import DraftsListView from './components/DraftsListView';
import ReviewView from './components/ReviewView';
import BrandKitView from './components/BrandKitView';
import InsightsDashboard from './components/InsightsDashboard';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('grievance_token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('grievance_user') ? JSON.parse(localStorage.getItem('grievance_user')) : null
  );

  const [currentView, setCurrentView] = useState('drafts'); // 'drafts' | 'review' | 'brand-kit' | 'insights'
  const [selectedDraftId, setSelectedDraftId] = useState(null);

  // Parse URL hash to determine route
  function parseHashRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('drafts/')) {
      const draftId = hash.replace('drafts/', '');
      setCurrentView('review');
      setSelectedDraftId(draftId);
    } else if (hash === 'brand-kit') {
      setCurrentView('brand-kit');
      setSelectedDraftId(null);
    } else if (hash === 'insights') {
      setCurrentView('insights');
      setSelectedDraftId(null);
    } else {
      setCurrentView('drafts');
      setSelectedDraftId(null);
    }
  }

  // Set up hash listener for refresh preservation and deep links
  useEffect(() => {
    parseHashRoute();
    const handleHashChange = () => parseHashRoute();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function navigateTo(route) {
    window.location.hash = route;
  }

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
    if (!window.location.hash || window.location.hash === '#/') {
      navigateTo('drafts');
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setSelectedDraftId(null);
    localStorage.removeItem('grievance_token');
    localStorage.removeItem('grievance_user');
    window.location.hash = '';
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
        <div className="nav-brand" onClick={() => navigateTo('drafts')} style={{ cursor: 'pointer' }}>
          <ShieldCheck size={22} className="text-primary" />
          <span>GrievanceAI</span>
          <span className="brand-badge">{user.workspaceName || 'Brewline Coffee Co.'}</span>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-btn ${currentView === 'drafts' && !selectedDraftId ? 'active' : ''}`}
            onClick={() => navigateTo('drafts')}
          >
            <FileText size={16} /> Drafts &amp; Compliance
          </button>
          <button 
            className={`nav-btn ${currentView === 'brand-kit' ? 'active' : ''}`}
            onClick={() => navigateTo('brand-kit')}
          >
            <BookOpen size={16} /> Brand Kit &amp; Rules
          </button>
          <button 
            className={`nav-btn ${currentView === 'insights' ? 'active' : ''}`}
            onClick={() => navigateTo('insights')}
          >
            <BarChart3 size={16} /> Brand Intelligence
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

      {/* Shared Demo Workspace Banner & Admin Reset Button (T18) */}
      <div className="demo-reset-strip">
        <div className="demo-reset-info">
          <RotateCcw size={14} className="text-muted" />
          <span>Shared demo workspace: changes reset periodically</span>
        </div>
        {user.role === 'admin' && (
          <button 
            className="btn btn-sm btn-outline text-danger"
            onClick={async () => {
              if (window.confirm('Reset the entire Brewline Coffee Co. workspace back to factory seed state?')) {
                try {
                  const res = await fetch('/api/brand-kit/reset-demo', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.ok) {
                    alert('Demo workspace reset successfully.');
                    window.location.reload();
                  } else {
                    alert('Reset failed.');
                  }
                } catch (e) {
                  alert('Reset error: ' + e.message);
                }
              }
            }}
          >
            <RotateCcw size={12} /> Reset Demo Data
          </button>
        )}
      </div>

      {/* Main Screen Content with Error Boundary */}
      <main className="main-content">
        <ErrorBoundary>
          {selectedDraftId ? (
            <ReviewView
              draftId={selectedDraftId}
              token={token}
              user={user}
              onBack={() => navigateTo('drafts')}
            />
          ) : currentView === 'drafts' ? (
            <DraftsListView
              token={token}
              user={user}
              onSelectDraft={(id) => navigateTo(`drafts/${id}`)}
            />
          ) : currentView === 'brand-kit' ? (
            <BrandKitView
              token={token}
              user={user}
            />
          ) : (
            <InsightsDashboard
              token={token}
              user={user}
              onSelectDraft={(id) => navigateTo(`drafts/${id}`)}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
