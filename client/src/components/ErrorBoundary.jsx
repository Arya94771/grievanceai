import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#drafts';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-card" style={{
          padding: '32px 24px',
          maxWidth: '600px',
          margin: '40px auto',
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#4B5563', marginBottom: '20px', lineHeight: 1.5 }}>
            An unexpected error occurred in this view. Your session and draft data are safe.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={15} /> Reload Workspace
            </button>
          </div>
          {this.state.error?.message && (
            <p style={{
              marginTop: '16px',
              fontSize: '0.75rem',
              color: '#9CA3AF',
              fontFamily: 'monospace',
              wordBreak: 'break-word'
            }}>
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
