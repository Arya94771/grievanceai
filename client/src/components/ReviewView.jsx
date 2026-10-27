import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Check, X, MessageSquare, AlertCircle, Shield, 
  RotateCcw, ArrowRight, Filter, ChevronRight, Eye, Edit3, 
  FileText, ExternalLink, CornerDownRight, CheckCircle2 
} from 'lucide-react';

export default function ReviewView({ draftId, token, user, onBack, onStatusChange }) {
  const [draft, setDraft] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [findings, setFindings] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  // Filtering
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'all' | 'resolved'
  const [activeFindingId, setActiveFindingId] = useState(null);

  // Modals for Reject / Dispute
  const [decisionModal, setDecisionModal] = useState({ show: false, findingId: null, type: null, note: '' });

  // Manual Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadDraftData();
  }, [draftId]);

  async function loadDraftData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load draft');
      const data = await res.json();
      setDraft(data.draft);
      setRevisions(data.revisions || []);
      setFindings(data.findings || []);
      setComments(data.comments || []);
      setEditContent(data.draft.content);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Trigger Review
  async function handleRunReview() {
    try {
      setReviewing(true);
      const res = await fetch(`/api/drafts/${draftId}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      if (data.note) {
        setReviewNote(data.note);
      } else {
        setReviewNote(data.aiUsed ? 'AI Review complete with Gemini verification.' : '');
      }
      loadDraftData();
    } catch (err) {
      alert(`Review error: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  }

  // Handle Accept / Reject / Dispute
  async function handleDecision(findingId, decision, decisionNote = '') {
    try {
      const res = await fetch(`/api/drafts/${draftId}/findings/${findingId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ decision, decisionNote })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to submit decision');

      setDecisionModal({ show: false, findingId: null, type: null, note: '' });
      loadDraftData();
    } catch (err) {
      alert(`Decision error: ${err.message}`);
    }
  }

  // Handle Manual Save
  async function handleSaveManualEdit() {
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editContent,
          note: 'Manual edit in review editor'
        })
      });
      if (!res.ok) throw new Error('Failed to save edit');
      setIsEditing(false);
      loadDraftData();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    }
  }

  if (loading) {
    return <div className="page-container loading-state">Loading draft review workspace...</div>;
  }
  if (error || !draft) {
    return <div className="page-container error-card">{error || 'Draft not found'}</div>;
  }

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (statusFilter === 'open' && f.status !== 'open') return false;
    if (statusFilter === 'resolved' && f.status === 'open') return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  const openFindingsCount = findings.filter(f => f.status === 'open').length;

  // Render text with interactive spans
  function renderHighlightedText() {
    const text = draft.content;
    const openFindings = findings.filter(f => f.status === 'open' && f.start >= 0 && f.end <= text.length);

    if (openFindings.length === 0) {
      return <div className="draft-body-text">{text}</div>;
    }

    // Sort spans by start
    const sorted = [...openFindings].sort((a, b) => a.start - b.start);
    const elements = [];
    let lastIndex = 0;

    sorted.forEach((finding, idx) => {
      // Non-highlighted gap
      if (finding.start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{text.substring(lastIndex, finding.start)}</span>
        );
      }

      // Highlighted span
      const isSelected = activeFindingId === finding._id;
      const highlightSpan = text.substring(Math.max(lastIndex, finding.start), finding.end);

      elements.push(
        <mark
          key={`mark-${finding._id}`}
          className={`highlight-span sev-${finding.severity} ${isSelected ? 'selected' : ''}`}
          onClick={() => setActiveFindingId(finding._id)}
          title={`Click to view ${finding.category} issue`}
        >
          {highlightSpan}
        </mark>
      );

      lastIndex = Math.max(lastIndex, finding.end);
    });

    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">{text.substring(lastIndex)}</span>
      );
    }

    return <div className="draft-body-text">{elements}</div>;
  }

  return (
    <div className="review-container">
      {/* Persistent Brand Governance Banner */}
      <div className="persistent-ai-banner">
        <div className="ai-banner-content">
          <Sparkles size={18} className="text-primary" />
          <span>
            <strong>AI-assisted review using Gemini.</strong> Suggestions are never applied without your explicit approval.
          </span>
        </div>
        {reviewNote && (
          <span className="badge badge-category">{reviewNote}</span>
        )}
      </div>

      {/* Review Header */}
      <div className="review-header">
        <div className="review-title-area">
          <button className="back-link" onClick={onBack}>
            &larr; All Drafts
          </button>
          <h1 className="draft-title">{draft.title}</h1>
          <div className="draft-meta-pills">
            <span className="pill-channel">{draft.channel}</span>
            <span className={`pill-status status-${draft.status}`}>
              {draft.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="pill-revision">Revision #{revisions.length}</span>
            <span className="pill-author">By {draft.creatorName}</span>
          </div>
        </div>

        <div className="review-actions">
          <button 
            className="btn btn-outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 size={15} /> {isEditing ? 'Cancel Edit' : 'Edit Text'}
          </button>
          <button 
            className="btn btn-primary btn-review"
            onClick={handleRunReview}
            disabled={reviewing}
          >
            <Sparkles size={16} />
            {reviewing ? 'Auditing Guidelines...' : 'Run Review'}
          </button>
        </div>
      </div>

      {/* Stated Intent Strip */}
      {draft.intent && (
        <div className="intent-strip">
          <strong>Creator's Stated Intent:</strong> "{draft.intent}"
        </div>
      )}

      {/* Main Review Grid */}
      <div className="review-main-grid">
        {/* LEFT COLUMN: Draft Text / Editor */}
        <div className="draft-content-panel card">
          <div className="panel-header">
            <h3>Document Content</h3>
            <span className="text-muted text-sm">
              {openFindingsCount} open finding{openFindingsCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="panel-body">
            {isEditing ? (
              <div className="editor-mode">
                <textarea
                  className="form-control editor-textarea"
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="editor-actions">
                  <button className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveManualEdit}>Save as New Revision</button>
                </div>
              </div>
            ) : (
              renderHighlightedText()
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Findings & Suggestions */}
        <div className="findings-panel card">
          <div className="panel-header">
            <h3>Governance Findings</h3>
            <div className="findings-stats">
              <span className="count-badge">{filteredFindings.length}</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="filters-bar">
            <div className="filter-item">
              <select 
                className="form-control-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="open">Open Only ({openFindingsCount})</option>
                <option value="resolved">Resolved ({findings.length - openFindingsCount})</option>
                <option value="all">All ({findings.length})</option>
              </select>
            </div>
            <div className="filter-item">
              <select 
                className="form-control-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="claims">Claims</option>
                <option value="tone">Tone</option>
                <option value="terminology">Terminology</option>
                <option value="accessibility">Accessibility</option>
                <option value="messaging">Messaging</option>
              </select>
            </div>
            <div className="filter-item">
              <select 
                className="form-control-sm"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Findings List */}
          <div className="findings-list">
            {findings.length === 0 ? (
              <div className="empty-findings">
                <Shield size={36} className="text-muted" />
                <p>No findings logged yet. Click <strong>"Run Review"</strong> to audit against Brewline brand guidelines.</p>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="empty-findings">
                <CheckCircle2 size={36} className="text-success" />
                <p>No findings match your active filters.</p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = activeFindingId === finding._id;
                const isOpen = finding.status === 'open';

                return (
                  <div 
                    key={finding._id}
                    id={`finding-${finding._id}`}
                    className={`finding-card sev-${finding.severity} ${isSelected ? 'active-card' : ''} ${!isOpen ? 'decided-card' : ''}`}
                    onClick={() => setActiveFindingId(finding._id)}
                  >
                    {/* Finding Header */}
                    <div className="finding-header">
                      <div className="finding-badges">
                        <span className={`badge badge-severity sev-${finding.severity}`}>
                          {finding.severity}
                        </span>
                        <span className="badge badge-category">
                          {finding.category}
                        </span>
                        <span className={`badge badge-confidence conf-${finding.confidence}`}>
                          {finding.confidence} confidence
                        </span>
                        {finding.sourceId && (
                          <span className="badge badge-source">
                            {finding.sourceType.toUpperCase()}: {finding.sourceId}
                          </span>
                        )}
                      </div>

                      {!isOpen && (
                        <span className={`badge status-pill status-${finding.status}`}>
                          {finding.status}
                        </span>
                      )}
                    </div>

                    {/* Flagged Issue / Reason */}
                    <div className="finding-reason">
                      {finding.reason}
                    </div>

                    {/* Source Quote Box */}
                    {finding.sourceText && (
                      <div className="source-citation-box">
                        <div className="source-label">Brand Standard Source:</div>
                        <div className="source-text">{finding.sourceText}</div>
                      </div>
                    )}

                    {/* Before & After Diff Box */}
                    {finding.suggestion && (
                      <div className="diff-box">
                        <div className="diff-row diff-before">
                          <span className="diff-label">CURRENT</span>
                          <span className="diff-content strike">{finding.quote}</span>
                        </div>
                        <div className="diff-row diff-after">
                          <span className="diff-label">SUGGESTION</span>
                          <span className="diff-content highlight">{finding.suggestion}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for Open Findings */}
                    {isOpen ? (
                      <div className="finding-actions">
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecision(finding._id, 'accepted');
                          }}
                        >
                          <Check size={14} /> Accept Fix
                        </button>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionModal({ show: true, findingId: finding._id, type: 'rejected', note: '' });
                          }}
                        >
                          <X size={14} /> Reject
                        </button>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecisionModal({ show: true, findingId: finding._id, type: 'disputed', note: '' });
                          }}
                        >
                          <MessageSquare size={14} /> Dispute
                        </button>
                      </div>
                    ) : (
                      <div className="decision-audit-trail">
                        Decided by <strong>{finding.decidedBy || 'User'}</strong>
                        {finding.decisionNote && <span> &bull; "{finding.decisionNote}"</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Decision Modal (Reject / Dispute) */}
      {decisionModal.show && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>
                {decisionModal.type === 'rejected' ? 'Reject Suggestion' : 'Dispute Brand Finding'}
              </h2>
              <button 
                className="icon-btn" 
                onClick={() => setDecisionModal({ show: false, findingId: null, type: null, note: '' })}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleDecision(decisionModal.findingId, decisionModal.type, decisionModal.note);
            }}>
              <div className="modal-body">
                <p className="modal-hint">
                  {decisionModal.type === 'rejected' 
                    ? 'Provide an optional reason why this suggestion was declined.' 
                    : 'Explain your dispute rationale. This will be posted to the draft comment thread for the reviewer.'}
                </p>
                <div className="form-group">
                  <label>{decisionModal.type === 'rejected' ? 'Rejection Reason (Optional)' : 'Dispute Comment (Required)'}</label>
                  <textarea
                    rows={4}
                    className="form-control"
                    placeholder="Enter your rationale..."
                    value={decisionModal.note}
                    onChange={(e) => setDecisionModal({ ...decisionModal, note: e.target.value })}
                    required={decisionModal.type === 'disputed'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setDecisionModal({ show: false, findingId: null, type: null, note: '' })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm {decisionModal.type === 'rejected' ? 'Rejection' : 'Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
