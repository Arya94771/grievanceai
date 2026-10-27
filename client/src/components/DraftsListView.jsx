import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Upload, Sparkles, Clock, AlertTriangle, 
  CheckCircle, ArrowRight, X, Filter, Tag 
} from 'lucide-react';

export default function DraftsListView({ token, user, onSelectDraft }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Draft Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState('paste'); // 'paste' | 'upload'
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Instagram');
  const [intent, setIntent] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showStartCard, setShowStartCard] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, [token]);

  async function fetchDrafts() {
    try {
      setLoading(true);
      const res = await fetch('/api/drafts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load drafts');
      const data = await res.json();
      setDrafts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDraft(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      let res;

      if (createMode === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('channel', channel);
        formData.append('intent', intent);
        formData.append('file', selectedFile);

        res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch('/api/drafts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title, channel, intent, content })
        });
      }

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create draft');

      setShowCreateModal(false);
      setTitle('');
      setIntent('');
      setContent('');
      setSelectedFile(null);
      fetchDrafts();
      if (resData.draft?._id) {
        onSelectDraft(resData.draft._id);
      }
    } catch (err) {
      alert(`Creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drafts-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Drafts &amp; Compliance</h1>
          <p className="page-subtitle">
            Review and govern draft collateral before publication across marketing and social channels.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} /> New Draft
        </button>
      </div>

      {/* T17 "Start here" Card (4 steps, one line each) */}
      {showStartCard && (
        <div className="start-here-card">
          <div className="start-here-header">
            <div className="start-here-title">
              <Sparkles size={18} className="text-primary" />
              <h3>Start here: 4-Step Quick Tour</h3>
            </div>
            <button className="icon-btn" onClick={() => setShowStartCard(false)} title="Dismiss">
              <X size={16} />
            </button>
          </div>
          <div className="start-here-steps">
            <div className="start-step-item">
              <span className="step-badge">1</span>
              <span>Open any of the 3 preloaded <strong>Brewline Coffee Co.</strong> sample drafts below.</span>
            </div>
            <div className="start-step-item">
              <span className="step-badge">2</span>
              <span>Click <strong>"Run Review"</strong> to verify content against brand clauses, facts &amp; terms.</span>
            </div>
            <div className="start-step-item">
              <span className="step-badge">3</span>
              <span>Click <strong>"Accept Fix"</strong> on a suggestion to create a new numbered revision.</span>
            </div>
            <div className="start-step-item">
              <span className="step-badge">4</span>
              <span>Submit for review &amp; switch role to <strong>Manager</strong> to approve or request changes.</span>
            </div>
          </div>
        </div>
      )}

      {/* Inline hint strip */}
      <div className="inline-hint-strip">
        <span>💡 <strong>Tip:</strong> You can paste text or upload documents (.txt, .docx, .pdf) when creating new drafts. Text is extracted automatically on the server.</span>
      </div>

      {loading ? (
        <div className="loading-state">Loading workspace drafts...</div>
      ) : error ? (
        <div className="error-card">{error}</div>
      ) : drafts.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} className="text-muted" />
          <h3>No drafts in this workspace</h3>
          <p>Create a new draft or click one of the seeded sample drafts to try the platform.</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
            Create First Draft
          </button>
        </div>
      ) : (
        <div className="drafts-grid">
          {drafts.map((d) => (
            <div 
              key={d._id} 
              className="draft-card"
              onClick={() => onSelectDraft(d._id)}
            >
              <div className="draft-card-header">
                <span className="pill-channel">{d.channel}</span>
                <span className={`pill-status status-${d.status}`}>
                  {d.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <h3 className="draft-card-title">{d.title}</h3>
              <p className="draft-card-snippet">
                {d.content.length > 140 ? d.content.substring(0, 140) + '...' : d.content}
              </p>

              {d.intent && (
                <div className="draft-card-intent">
                  <strong>Intent:</strong> {d.intent}
                </div>
              )}

              <div className="draft-card-footer">
                <div className="draft-footer-left">
                  {d.openFindingsCount > 0 ? (
                    <span className="badge badge-severity sev-high">
                      <AlertTriangle size={12} /> {d.openFindingsCount} Open Issue{d.openFindingsCount === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <CheckCircle size={12} /> Clean / Resolved
                    </span>
                  )}
                  <span className="draft-author-sub">by {d.creatorName || 'Creator'}</span>
                </div>
                <button className="icon-btn" title="Open Review Workspace">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Draft Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h2><Plus size={20} /> Create New Content Draft</h2>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDraft}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Draft Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Monsoon Roast Announcement"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Distribution Channel</label>
                    <select
                      className="form-control"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Press Release">Press Release</option>
                      <option value="Email Newsletter">Email Newsletter</option>
                      <option value="Blog / Website">Blog / Website</option>
                      <option value="Packaging Copy">Packaging Copy</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Author's Stated Intent / Purpose</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Promote limited-edition harvest to specialty coffee lovers with craft tone"
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                  />
                  <small className="form-text-muted">
                    The AI auditor uses this to preserve your original objective when making minimal surgical edits.
                  </small>
                </div>

                {/* Input Method Switch: Paste or File Upload */}
                <div className="mode-toggle-group">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${createMode === 'paste' ? 'active' : ''}`}
                    onClick={() => setCreateMode('paste')}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${createMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setCreateMode('upload')}
                  >
                    <Upload size={14} /> Upload File (.txt, .docx, .pdf)
                  </button>
                </div>

                {createMode === 'paste' ? (
                  <div className="form-group">
                    <label>Draft Content</label>
                    <textarea
                      rows={8}
                      className="form-control"
                      placeholder="Paste your marketing copy, article, or announcement here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required={createMode === 'paste'}
                    />
                  </div>
                ) : (
                  <div className="form-group file-upload-box">
                    <label>Select Document (.txt, .docx, or .pdf)</label>
                    <input
                      type="file"
                      accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="form-control"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      required={createMode === 'upload'}
                    />
                    {selectedFile && (
                      <p className="file-selected-text">
                        Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    <small className="form-text-muted">
                      Text will be extracted automatically using mammoth / pdf-parse on the server.
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create & Open Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
