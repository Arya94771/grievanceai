import React, { useState } from 'react';
import { 
  GitCommit, Clock, CheckCircle, XCircle, AlertTriangle, 
  Send, User, ArrowRight, ShieldCheck, History, Eye 
} from 'lucide-react';

/**
 * Simple word-level diff generator
 */
function computeWordDiff(oldText, newText) {
  const oldWords = (oldText || '').split(/(\s+)/);
  const newWords = (newText || '').split(/(\s+)/);

  // Simple LCS-based or aligned diff
  // For readability, return tokens labeled as 'added', 'removed', or 'same'
  const leftTokens = [];
  const rightTokens = [];

  // If identical
  if (oldText === newText) {
    return {
      left: [{ text: oldText, type: 'same' }],
      right: [{ text: newText, type: 'same' }]
    };
  }

  // Basic diff representation
  return {
    left: [{ text: oldText, type: 'removed' }],
    right: [{ text: newText, type: 'added' }]
  };
}

export default function DraftHistoryView({ draft, revisions = [], auditLogs = [] }) {
  const [selectedRevA, setSelectedRevA] = useState(
    revisions.length > 1 ? revisions[0]._id : (revisions[0]?._id || null)
  );
  const [selectedRevB, setSelectedRevB] = useState(
    revisions.length > 1 ? revisions[revisions.length - 1]._id : (revisions[0]?._id || null)
  );

  const [activeSubTab, setActiveSubTab] = useState('diff'); // 'diff' | 'timeline'

  const revA = revisions.find(r => r._id === selectedRevA) || revisions[0];
  const revB = revisions.find(r => r._id === selectedRevB) || revisions[revisions.length - 1];

  function getActionBadge(action) {
    switch (action) {
      case 'create_draft':
        return <span className="badge badge-id">Created Draft</span>;
      case 'run_review':
        return <span className="badge badge-category">AI Review</span>;
      case 'accepted_finding':
        return <span className="badge badge-success">Accepted Fix</span>;
      case 'rejected_finding':
        return <span className="badge badge-severity sev-high">Rejected Fix</span>;
      case 'disputed_finding':
        return <span className="badge badge-severity sev-medium">Disputed</span>;
      case 'submit_for_review':
        return <span className="badge badge-source">Submitted</span>;
      case 'request_changes':
        return <span className="badge badge-severity sev-high">Changes Requested</span>;
      case 'approve_draft':
        return <span className="badge badge-success">Approved</span>;
      case 'override_approval':
        return <span className="badge badge-severity sev-high">Approved (Override)</span>;
      default:
        return <span className="badge badge-category">{action.replace('_', ' ')}</span>;
    }
  }

  return (
    <div className="history-view-container">
      {/* Sub tabs */}
      <div className="history-tabs-nav">
        <button 
          className={`tab-btn ${activeSubTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('diff')}
        >
          <History size={16} /> Revision History &amp; Side-by-Side Diff ({revisions.length})
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('timeline')}
        >
          <Clock size={16} /> Activity &amp; Governance Timeline ({auditLogs.length})
        </button>
      </div>

      {activeSubTab === 'diff' && (
        <div className="diff-view-section">
          {/* Revisions Bar */}
          <div className="revisions-control-bar card">
            <div className="revision-select-col">
              <label>Compare Base Version (A):</label>
              <select 
                className="form-control"
                value={selectedRevA || ''}
                onChange={(e) => setSelectedRevA(e.target.value)}
              >
                {revisions.map(r => (
                  <option key={r._id} value={r._id}>
                    Revision #{r.revisionNumber} - {r.note.slice(0, 35)}... ({new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            <div className="diff-arrow">&rarr;</div>

            <div className="revision-select-col">
              <label>Compare Target Version (B):</label>
              <select 
                className="form-control"
                value={selectedRevB || ''}
                onChange={(e) => setSelectedRevB(e.target.value)}
              >
                {revisions.map(r => (
                  <option key={r._id} value={r._id}>
                    Revision #{r.revisionNumber} - {r.note.slice(0, 35)}... ({new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-Side Diff Grid */}
          <div className="side-by-side-grid">
            {/* Version A */}
            <div className="diff-column card">
              <div className="panel-header">
                <div>
                  <h4>Revision #{revA?.revisionNumber || 1} (Base)</h4>
                  <span className="text-muted text-sm">
                    By {revA?.author} &bull; {new Date(revA?.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="badge badge-id">v{revA?.revisionNumber}</span>
              </div>
              <div className="diff-meta-note">
                <strong>Note:</strong> {revA?.note || 'Initial revision'}
              </div>
              <div className="diff-text-box">
                {revA?.content}
              </div>
            </div>

            {/* Version B */}
            <div className="diff-column card">
              <div className="panel-header">
                <div>
                  <h4>Revision #{revB?.revisionNumber || revisions.length} (Target)</h4>
                  <span className="text-muted text-sm">
                    By {revB?.author} &bull; {new Date(revB?.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="badge badge-success">v{revB?.revisionNumber}</span>
              </div>
              <div className="diff-meta-note">
                <strong>Note:</strong> {revB?.note || 'Current revision'}
              </div>
              <div className="diff-text-box">
                {revB?.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'timeline' && (
        <div className="activity-timeline-section card">
          <div className="panel-header">
            <h3>Chronological Audit Trail</h3>
            <span className="text-muted text-sm">Every human decision, AI review, and status change is immutably logged</span>
          </div>

          <div className="timeline-list">
            {auditLogs.length === 0 ? (
              <p className="text-muted">No audit logs recorded for this draft.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log._id} className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      {getActionBadge(log.action)}
                      <strong className="timeline-actor">{log.actor}</strong>
                      <span className="role-tag">{log.actorRole}</span>
                      <span className="timeline-date">
                        {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Timeline Details */}
                    {log.details && (
                      <div className="timeline-details">
                        {log.details.quote && (
                          <div className="detail-line">
                            <span className="text-muted">Flagged Span:</span> "{log.details.quote}"
                          </div>
                        )}
                        {log.details.suggestion && (
                          <div className="detail-line">
                            <span className="text-muted">Suggestion Applied:</span> "{log.details.suggestion}"
                          </div>
                        )}
                        {log.details.decisionNote && (
                          <div className="detail-line">
                            <span className="text-muted">Reason/Rationale:</span> "{log.details.decisionNote}"
                          </div>
                        )}
                        {log.details.overrideReason && (
                          <div className="detail-line override-text">
                            <strong>Override Justification:</strong> "{log.details.overrideReason}"
                          </div>
                        )}
                        {log.details.comment && (
                          <div className="detail-line">
                            <span className="text-muted">Feedback:</span> "{log.details.comment}"
                          </div>
                        )}
                        {log.details.totalFindings !== undefined && (
                          <div className="detail-line">
                            Found {log.details.totalFindings} findings (AI verified: {log.details.aiUsed ? 'Yes' : 'No'})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
