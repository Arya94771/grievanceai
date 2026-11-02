import React, { useState } from 'react';
import { 
  Sparkles, Check, X, MessageSquare, AlertCircle, Shield, 
  RotateCcw, ArrowRight, Eye, Upload, Palette, Maximize2,
  CheckCircle2, AlertTriangle, ShieldAlert, Layers
} from 'lucide-react';

export default function ImageReviewPanel({
  draft,
  findings,
  token,
  user,
  activeFindingId,
  onSelectFinding,
  onDecision,
  onRefreshDraft
}) {
  const [selectedCreativeIndex, setSelectedCreativeIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const creatives = draft.creatives || [];
  const currentCreative = creatives[selectedCreativeIndex] || null;

  // Filter visual findings for the current creative or all visual findings
  const visualFindings = findings.filter(f => f.mediaType === 'image');
  const openVisualFindings = visualFindings.filter(f => f.status === 'open');

  async function handleUploadCreative(e) {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', uploadFile);

      const res = await fetch(`/api/drafts/${draft._id}/creatives`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPreview(null);
      onRefreshDraft();
      alert('Creative uploaded successfully. Click "Run Review" to audit with visual engine.');
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  const severityColors = {
    high: { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', text: '#DC2626' },
    medium: { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', text: '#D97706' },
    low: { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', text: '#2563EB' }
  };

  return (
    <div className="image-review-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Creative Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} className="text-primary" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Marketing Creatives ({creatives.length})
          </span>
          {creatives.length > 1 && (
            <select
              className="form-control"
              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
              value={selectedCreativeIndex}
              onChange={(e) => setSelectedCreativeIndex(Number(e.target.value))}
            >
              {creatives.map((c, i) => (
                <option key={i} value={i}>
                  Creative #{i + 1} ({c.originalName} - {c.width}x{c.height})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {creatives.length >= 2 && (
            <button 
              className="btn btn-sm btn-outline"
              onClick={() => setShowCompareModal(true)}
              title="Compare creative revisions side by side"
            >
              <Maximize2 size={14} /> Side-by-Side Compare
            </button>
          )}
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={14} /> {creatives.length === 0 ? 'Upload Marketing Creative' : 'Re-Upload Revised Creative'}
          </button>
        </div>
      </div>

      {creatives.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#FFFFFF',
          border: '2px dashed var(--border)',
          borderRadius: '12px'
        }}>
          <Upload size={36} className="text-muted" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No Visual Creative Uploaded</h3>
          <p className="text-muted" style={{ maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.85rem' }}>
            Upload a marketing banner, social visual, or packaging mock-up (PNG, JPG, WebP) to audit logo geometry, color palette adherence, and embedded promotional text.
          </p>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={15} /> Upload Creative Image
          </button>
        </div>
      ) : (
        /* Visual Audit Workspace Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(320px, 1fr)',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left Column: Image Canvas with Overlay Bounding Boxes */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              <span><strong>Interactive Bounding Boxes</strong> &bull; Click any box to inspect</span>
              <span>{currentCreative.width} &times; {currentCreative.height} px</span>
            </div>

            {/* Canvas Container with Overlays */}
            <div style={{
              position: 'relative',
              width: '100%',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              lineHeight: 0
            }}>
              <img
                src={currentCreative.url}
                alt={currentCreative.originalName}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* Bounding Box Overlays */}
              {visualFindings.map((finding, idx) => {
                if (!finding.region || finding.status !== 'open') return null;
                const isSelected = activeFindingId === finding._id;
                const colors = severityColors[finding.severity] || severityColors.medium;

                const topPercent = (finding.region.y / 10).toFixed(2);
                const leftPercent = (finding.region.x / 10).toFixed(2);
                const widthPercent = (finding.region.w / 10).toFixed(2);
                const heightPercent = (finding.region.h / 10).toFixed(2);

                return (
                  <div
                    key={finding._id || idx}
                    onClick={() => onSelectFinding(finding._id)}
                    style={{
                      position: 'absolute',
                      top: `${topPercent}%`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      border: `2.5px solid ${colors.border}`,
                      backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.3)' : colors.bg,
                      boxShadow: isSelected ? `0 0 12px ${colors.border}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      zIndex: isSelected ? 10 : 2
                    }}
                    title={`${finding.category.toUpperCase()}: ${finding.reason}`}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '0',
                      backgroundColor: colors.border,
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      lineHeight: '1.2',
                      whiteSpace: 'nowrap'
                    }}>
                      #{idx + 1} {finding.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Visual Findings List with Evidence Crops & Swatches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Visual Compliance Findings ({visualFindings.length})
              </h3>
              <span className="badge badge-primary">
                {openVisualFindings.length} Open
              </span>
            </div>

            {visualFindings.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}>
                <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600 }}>Visual Audit Compliant</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  No logo distortion, off-palette colors, or claim discrepancies detected.
                </div>
              </div>
            ) : (
              visualFindings.map((finding, idx) => {
                const isSelected = activeFindingId === finding._id;
                const isResolved = finding.status !== 'open';
                const colors = severityColors[finding.severity] || severityColors.medium;

                return (
                  <div
                    key={finding._id || idx}
                    onClick={() => onSelectFinding(finding._id)}
                    style={{
                      background: '#FFFFFF',
                      border: isSelected ? `2px solid ${colors.border}` : '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '16px',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'border 0.2s'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${finding.severity}`}>
                          {finding.severity}
                        </span>
                        <span className="badge badge-category">
                          {finding.category}
                        </span>
                        <span className={`badge ${finding.confidence === 'clear' ? 'badge-verified' : 'badge-outline'}`}>
                          {finding.confidence.toUpperCase()}
                        </span>
                      </div>
                      <span className={`pill-status status-${finding.status}`} style={{ fontSize: '0.7rem' }}>
                        {finding.status}
                      </span>
                    </div>

                    {/* Title / Quote */}
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px', color: '#1E293B' }}>
                      {finding.quote}
                    </div>

                    {/* Reason */}
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px', lineHeight: 1.4 }}>
                      {finding.reason}
                    </p>

                    {/* Evidence Crops & Measurements (V5) */}
                    {finding.evidenceCropId && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        marginBottom: '12px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '4px', fontWeight: 600 }}>Detected Crop</div>
                          <img
                            src={`/api/images/${finding.evidenceCropId}`}
                            alt="Detected logo crop"
                            style={{ maxHeight: '54px', maxWidth: '100px', objectFit: 'contain', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                          />
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#334155', flex: 1 }}>
                          {finding.measured?.aspectRatio && (
                            <div>&bull; Measured Aspect Ratio: <strong>{finding.measured.aspectRatio}</strong></div>
                          )}
                          {finding.measured?.aspectDeviationPercent && (
                            <div>&bull; Distortion: <strong>{finding.measured.aspectDeviationPercent}%</strong> (Threshold: 8%)</div>
                          )}
                          {finding.measured?.widthPercent && (
                            <div>&bull; Size: <strong>{finding.measured.widthPercent}%</strong> of creative width</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Palette Swatches (V5) */}
                    {finding.measured?.detectedHex && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        marginBottom: '12px',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: finding.measured.detectedHex, border: '1px solid rgba(0,0,0,0.2)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>Detected</div>
                            <code>{finding.measured.detectedHex}</code>
                          </div>
                        </div>

                        <ArrowRight size={14} className="text-muted" />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: finding.measured.nearestHex, border: '1px solid rgba(0,0,0,0.2)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>Approved ({finding.measured.nearestName})</div>
                            <code>{finding.measured.nearestHex}</code>
                          </div>
                        </div>

                        <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                          &Delta;E = {finding.measured.deltaE}
                        </span>
                      </div>
                    )}

                    {/* Actionable Suggestion */}
                    {finding.suggestion && (
                      <div style={{
                        padding: '8px 10px',
                        background: '#EFF6FF',
                        borderLeft: '3px solid #3B82F6',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#1E40AF',
                        marginBottom: '12px'
                      }}>
                        <strong>Actionable Fix:</strong> {finding.suggestion}
                      </div>
                    )}

                    {/* Human Action Buttons */}
                    {!isResolved && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                        <button
                          className="btn btn-sm btn-outline text-danger"
                          onClick={(e) => { e.stopPropagation(); onDecision(finding._id, 'rejected'); }}
                        >
                          <X size={13} /> Reject
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => { e.stopPropagation(); onDecision(finding._id, 'disputed'); }}
                        >
                          <MessageSquare size={13} /> Dispute
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => { e.stopPropagation(); onDecision(finding._id, 'accepted'); }}
                        >
                          <Check size={13} /> Accept Fix
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Upload Revised Creative Modal (V5) */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2><Upload size={20} /> Upload Marketing Creative</h2>
              <button className="icon-btn" onClick={() => setShowUploadModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUploadCreative}>
              <div className="modal-body">
                <p className="modal-hint">
                  Upload promotional creative graphics, advertisements, or packaging assets (PNG, JPG, WebP). The visual engine performs deterministic color distance analysis, aspect-ratio logo distortion checks, and OCR claim auditing.
                </p>
                <div className="form-group">
                  <label>Select Creative Image</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadFile(file);
                        setUploadPreview(URL.createObjectURL(file));
                      }
                    }}
                    required
                  />
                  <small className="text-muted">Maximum file size: 4 MB.</small>
                </div>

                {uploadPreview && (
                  <div style={{ textAlign: 'center', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <img src={uploadPreview} alt="Preview" style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '4px' }} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? 'Processing...' : 'Upload & Save Creative'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Comparison Modal (V5) */}
      {showCompareModal && creatives.length >= 2 && (
        <div className="modal-backdrop">
          <div className="modal-box modal-lg" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2><Maximize2 size={20} /> Creative Revision Comparison</h2>
              <button className="icon-btn" onClick={() => setShowCompareModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.9rem' }}>
                    Revision 1 (Original)
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: '#F8FAFC' }}>
                    <img src={creatives[0].url} alt="Rev 1" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                    {creatives[0].originalName} &bull; {creatives[0].width}x{creatives[0].height}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.9rem', color: 'var(--primary)' }}>
                    Latest Revision (Corrected)
                  </div>
                  <div style={{ border: '2px solid var(--primary)', borderRadius: '8px', overflow: 'hidden', background: '#F8FAFC' }}>
                    <img src={creatives[creatives.length - 1].url} alt="Latest Rev" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                    {creatives[creatives.length - 1].originalName} &bull; {creatives[creatives.length - 1].width}x{creatives[creatives.length - 1].height}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowCompareModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
