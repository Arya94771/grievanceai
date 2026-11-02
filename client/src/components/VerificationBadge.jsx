import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function VerificationBadge({ trail = [], status = 'unverified' }) {
  const [expanded, setExpanded] = useState(false);

  if (!trail || trail.length === 0) {
    return null;
  }

  const passedCount = trail.filter(t => t.passed).length;
  const isVerified = status === 'verified';
  const isPartial = status === 'partially_verified';

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        type="button"
        className={`badge ${isVerified ? 'badge-verified' : isPartial ? 'badge-confidence conf-possible' : 'badge-confidence conf-unverified'}`}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: 'none',
          padding: '4px 8px',
          fontSize: '0.75rem'
        }}
      >
        <ShieldCheck size={12} />
        <span>
          {isVerified ? 'Evidence-Verified' : isPartial ? 'Partially Verified' : 'Unverified'} ({passedCount}/{trail.length} steps)
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: '#F8F9FA',
            border: '1px solid #E9ECEF',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1B4332' }}>
            6-Step Evidence Verification Audit Trail:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {trail.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                {item.passed ? (
                  <CheckCircle2 size={14} className="text-success" style={{ marginTop: '2px', flexShrink: 0 }} />
                ) : (
                  <XCircle size={14} className="text-danger" style={{ marginTop: '2px', flexShrink: 0 }} />
                )}
                <div>
                  <strong style={{ color: item.passed ? '#2D6A4F' : '#E63946' }}>{item.name}: </strong>
                  <span style={{ color: '#495057' }}>{item.evidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
