import React, { useState, useEffect } from 'react';
import {
  TrendingUp, AlertTriangle, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, Download, ExternalLink, Filter, HelpCircle,
  BarChart2, RefreshCw, ChevronRight, Layers, Award
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';

export default function InsightsDashboard({ token, user, onSelectDraft }) {
  const [range, setRange] = useState('30');
  const [channel, setChannel] = useState('all');
  const [creator, setCreator] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, [range, channel, creator]);

  async function fetchInsights() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        range,
        channel,
        creator
      });
      const res = await fetch(`/api/insights?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load insights data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!data) return;
    const headers = ['Category', 'Rule ID', 'Occurrences', 'Distinct Drafts', 'Unclear Guideline', 'Override Rate'];
    const rows = (data.recurringIssues || []).map(r => [
      `"${r.category}"`,
      `"${r.ruleId}"`,
      r.occurrences,
      r.distinctDrafts,
      r.isUnclearGuideline ? 'YES' : 'NO',
      `${Math.round((r.overrideRate || 0) * 100)}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `grievanceai_brand_insights_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading && !data) {
    return (
      <div className="page-container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin text-primary" style={{ margin: '0 auto 16px' }} />
        <h3>Computing Brand Governance Analytics...</h3>
        <p className="text-muted">Aggregating compliance KPIs, recurrence fingerprints, and rule health.</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page-container" style={{ padding: '40px 20px' }}>
        <div className="alert alert-danger">
          <AlertCircle size={20} />
          <span>Error loading brand intelligence: {error}</span>
          <button className="btn btn-sm btn-outline ml-auto" onClick={fetchInsights}>Retry</button>
        </div>
      </div>
    );
  }

  const { kpis, weeklyTrend, topRules, recurringIssues, unresolvedHighRiskQueue } = data;

  return (
    <div className="page-container insights-container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>Brand Intelligence &amp; Risk Insights</h1>
            <span className="badge badge-category" style={{ fontSize: '0.75rem' }}>includes demo history</span>
          </div>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
            Predictive governance analytics, recurrence detection, and rule override health across all marketing channels.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} className="text-muted" />
            <select
              className="form-control form-control-sm"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ width: '110px' }}
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>

          {/* Channel Filter */}
          <select
            className="form-control form-control-sm"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="all">All Channels</option>
            <option value="social">Social Media</option>
            <option value="paid_ad">Paid Ads</option>
            <option value="press_release">Press Releases</option>
            <option value="website">Website Copy</option>
            <option value="email">Email Campaign</option>
          </select>

          {/* Export CSV */}
          <button className="btn btn-outline btn-sm" onClick={handleExportCsv} title="Export CSV Report">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Compliance Rate */}
        <div className="card" style={{ padding: '20px', borderRadius: '10px', borderLeft: '4px solid #2D6A4F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6c757d' }}>COMPLIANCE RATE</span>
            <ShieldCheck size={20} className="text-success" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '8px 0 2px', color: '#1B4332' }}>
            {kpis.complianceRate}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }} title="Percentage of reviewed drafts with 0 open high/critical violations">
            {kpis.compliantDrafts !== undefined ? `${kpis.compliantDrafts} of ${kpis.reviewedDrafts} drafts compliant` : 'Drafts with zero open high/critical findings'}
          </div>
        </div>

        {/* Open High Risk Findings */}
        <div className="card" style={{ padding: '20px', borderRadius: '10px', borderLeft: '4px solid #E63946' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6c757d' }}>OPEN HIGH-RISK ISSUES</span>
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '8px 0 2px', color: '#E63946' }}>
            {kpis.openHighRiskCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            Unresolved high / critical severity brand risks
          </div>
        </div>

        {/* Average Time to Resolve */}
        <div className="card" style={{ padding: '20px', borderRadius: '10px', borderLeft: '4px solid #457B9D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6c757d' }}>AVG RESOLUTION TIME</span>
            <Clock size={20} className="text-primary" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '8px 0 2px', color: '#1D3557' }}>
            {kpis.avgResolutionHours}h
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            From audit finding creation to accept/reject
          </div>
        </div>

        {/* AI Acceptance Rate */}
        <div className="card" style={{ padding: '20px', borderRadius: '10px', borderLeft: '4px solid #52B788' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6c757d' }}>AI FIX ACCEPTANCE</span>
            <Award size={20} className="text-success" />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '8px 0 2px', color: '#2D6A4F' }}>
            {kpis.aiAcceptanceRate}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            Brand team adoption of automated corrections
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Trend by Severity Area Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Weekly Risk Trend by Severity</h3>
            <span className="text-muted text-xs">Past {range} days</span>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke="#D90429" fill="#EF233C" fillOpacity={0.6} />
                <Area type="monotone" dataKey="high" name="High" stackId="1" stroke="#E63946" fill="#F4A261" fillOpacity={0.5} />
                <Area type="monotone" dataKey="medium" name="Medium" stackId="1" stroke="#2A9D8F" fill="#2A9D8F" fillOpacity={0.3} />
                <Area type="monotone" dataKey="low" name="Low" stackId="1" stroke="#52B788" fill="#52B788" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Violated Rules Bar Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Top Violated Brand Guidelines</h3>
            <span className="text-muted text-xs">By finding frequency</span>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRules} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E9ECEF" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="ruleId" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Violations" fill="#1B4332" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recurring Issues & Rule Health Table */}
      <div className="card" style={{ padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Recurring Issues &amp; Rule Health</h3>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Identified through content fingerprinting across drafts. High override rates flag ambiguous guidelines.
            </p>
          </div>
          <span className="badge badge-source" style={{ fontSize: '0.75rem' }}>
            Threshold: &ge; 40% reject rate over &ge; 5 decisions
          </span>
        </div>

        {recurringIssues.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
            <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 8px' }} />
            <p>No systemic recurring issues detected across your active drafts.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #DEE2E6', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Rule / Source</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px' }}>Sample Quote</th>
                  <th style={{ padding: '10px 8px' }}>Occurrences</th>
                  <th style={{ padding: '10px 8px' }}>Distinct Drafts</th>
                  <th style={{ padding: '10px 8px' }}>Guideline Health</th>
                </tr>
              </thead>
              <tbody>
                {recurringIssues.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #E9ECEF' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                      <span className="badge badge-source">{item.ruleId}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge badge-category">{item.category}</span>
                    </td>
                    <td style={{ padding: '12px 8px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <em>"{item.sampleQuote}"</em>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>{item.occurrences}x</td>
                    <td style={{ padding: '12px 8px' }}>{item.distinctDrafts} drafts</td>
                    <td style={{ padding: '12px 8px' }}>
                      {item.isUnclearGuideline ? (
                        <span className="badge badge-severity sev-high" title={`Dispute / Reject rate: ${Math.round(item.overrideRate * 100)}%`}>
                          <AlertTriangle size={11} style={{ marginRight: '4px' }} /> Possibly Unclear Guideline ({Math.round(item.overrideRate * 100)}% dispute)
                        </span>
                      ) : (
                        <span className="badge badge-confidence conf-clear">
                          Stable Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unresolved High-Risk Findings Queue */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#E63946' }}>
              Unresolved High-Risk Governance Queue ({unresolvedHighRiskQueue.length})
            </h3>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Deep-link directly to drafts requiring compliance mitigation before publication.
            </p>
          </div>
        </div>

        {unresolvedHighRiskQueue.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
            <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 8px' }} />
            <p>Clean queue! No open high-risk or critical governance violations.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unresolvedHighRiskQueue.map((item) => (
              <div
                key={item._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: '#FFF5F5',
                  border: '1px solid #FFE3E3',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-severity sev-high">
                      Risk {item.riskScore} &bull; {item.riskLevel.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '0.9rem' }}>{item.draftTitle}</strong>
                    <span className="text-muted text-xs">&bull; {item.category}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#495057' }}>
                    <span style={{ textDecoration: 'line-through', color: '#E63946' }}>"{item.quote}"</span> &rarr; {item.reason}
                  </div>
                  {item.riskDrivers && item.riskDrivers.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#868E96', marginTop: '3px' }}>
                      Drivers: {item.riskDrivers.join(' &bull; ')}
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => onSelectDraft(item.draftId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                >
                  Inspect Draft <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
