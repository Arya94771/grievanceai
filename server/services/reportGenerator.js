/**
 * GrievanceAI Governance Report Generator
 * Generates comprehensive Markdown and Print-Friendly HTML compliance audit reports
 */

function generateMarkdownReport(data) {
  const { draft, revisions, findings, comments, auditLogs, workspace } = data;
  const dateStr = new Date().toLocaleString();

  let md = `# Brand Governance Compliance Report: ${draft.title}\n\n`;
  md += `**Organization:** ${workspace?.name || 'Brewline Coffee Co.'}\n`;
  md += `**Generated:** ${dateStr}\n`;
  md += `**Distribution Channel:** ${draft.channel}\n`;
  md += `**Current Status:** ${draft.status.toUpperCase()}\n`;
  md += `**Author:** ${draft.creatorName}\n`;
  md += `**Revision:** #${revisions.length}\n`;
  if (draft.intent) {
    md += `**Stated Intent:** "${draft.intent}"\n`;
  }
  md += `\n---\n\n`;

  // 1. Current Content
  md += `## 1. Content Under Audit\n\n\`\`\`\n${draft.content}\n\`\`\`\n\n---\n\n`;

  // 2. Findings Summary
  const openCount = findings.filter(f => f.status === 'open').length;
  const acceptedCount = findings.filter(f => f.status === 'accepted').length;
  const rejectedCount = findings.filter(f => f.status === 'rejected').length;

  md += `## 2. Governance Findings Summary\n\n`;
  md += `- **Total Issues Audited:** ${findings.length}\n`;
  md += `- **Accepted Fixes:** ${acceptedCount}\n`;
  md += `- **Rejected Exceptions:** ${rejectedCount}\n`;
  md += `- **Remaining Open:** ${openCount}\n\n`;

  md += `### Detailed Findings Breakdown\n\n`;
  findings.forEach((f, idx) => {
    md += `#### ${idx + 1}. [${f.category.toUpperCase()} | ${f.severity.toUpperCase()}] "${f.quote}"\n`;
    md += `- **Status:** ${f.status.toUpperCase()}`;
    if (f.decidedBy) md += ` (Decided by ${f.decidedBy})`;
    md += `\n`;
    if (f.sourceId) md += `- **Source Citation:** [${f.sourceType.toUpperCase()}: ${f.sourceId}] ${f.sourceText ? `("${f.sourceText}")` : ''}\n`;
    if (f.verifiedAgainst) md += `- **Second-Pass Verified:** Yes (against ${f.verifiedAgainst})\n`;
    md += `- **Finding Reason:** ${f.reason}\n`;
    if (f.suggestion) md += `- **Suggested Fix:** "${f.suggestion}"\n`;
    if (f.decisionNote) md += `- **Decision Rationale:** "${f.decisionNote}"\n`;
    md += `\n`;
  });

  md += `---\n\n`;

  // 3. Comments & Review Discussion
  md += `## 3. Reviewer Comments & Discussion Thread\n\n`;
  if (!comments || comments.length === 0) {
    md += `*No comments recorded on this draft.*\n\n`;
  } else {
    comments.forEach(c => {
      md += `> **${c.author}** (${c.authorRole}) — *${new Date(c.createdAt).toLocaleString()}*\n`;
      md += `> ${c.text}\n\n`;
    });
  }

  md += `---\n\n`;

  // 4. Chronological Audit Trail
  md += `## 4. Immutable Governance Audit Trail\n\n`;
  md += `| Timestamp | Actor | Role | Action | Details |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  auditLogs.forEach(l => {
    const time = new Date(l.timestamp).toLocaleTimeString();
    const date = new Date(l.timestamp).toLocaleDateString();
    let detailStr = '';
    if (l.details?.overrideReason) detailStr = `OVERRIDE: ${l.details.overrideReason}`;
    else if (l.details?.comment) detailStr = l.details.comment;
    else if (l.details?.quote) detailStr = `"${l.details.quote}" -> "${l.details.suggestion || ''}"`;
    else detailStr = JSON.stringify(l.details || {});

    md += `| ${date} ${time} | ${l.actor} | ${l.actorRole} | ${l.action} | ${detailStr.replace(/\|/g, '-')} |\n`;
  });

  return md;
}

function generateHtmlReport(data) {
  const { draft, revisions, findings, comments, auditLogs, workspace } = data;
  const dateStr = new Date().toLocaleString();

  const openCount = findings.filter(f => f.status === 'open').length;
  const acceptedCount = findings.filter(f => f.status === 'accepted').length;
  const rejectedCount = findings.filter(f => f.status === 'rejected').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Governance Report — ${escapeHtml(draft.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #0F172A; max-width: 900px; margin: 40px auto; padding: 0 24px; }
    .header { border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .status-approved { background: #ECFDF5; color: #065F46; }
    .status-in_review { background: #FFFBEB; color: #92400E; }
    .status-draft { background: #F1F5F9; color: #475569; }
    .sev-high { background: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; }
    .sev-medium { background: #FFFBEB; color: #D97706; border: 1px solid #FCD34D; }
    .content-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; white-space: pre-wrap; font-size: 15px; margin-bottom: 28px; }
    .finding-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
    .finding-card.sev-high { border-left: 5px solid #DC2626; }
    .finding-card.sev-medium { border-left: 5px solid #D97706; }
    .diff-box { background: #F1F5F9; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin: 8px 0; }
    .strike { text-decoration: line-through; color: #DC2626; }
    .highlight { font-weight: bold; color: #059669; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; }
    th { background: #F8FAFC; }
    .comment { background: #F8FAFC; border-left: 3px solid #4F46E5; padding: 10px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <button onclick="window.print()" style="background:#4F46E5;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Print / Save as PDF</button>
    <span style="color:#64748B;font-size:13px;">GrievanceAI Audit Export &bull; Generated ${dateStr}</span>
  </div>

  <div class="header">
    <div style="font-size: 12px; font-weight: bold; color: #4F46E5; text-transform: uppercase;">Brand Governance Report &bull; ${escapeHtml(workspace?.name || 'Brewline Coffee Co.')}</div>
    <h1 style="margin: 6px 0;">${escapeHtml(draft.title)}</h1>
    <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
      <span class="badge status-${draft.status}">${draft.status.replace('_', ' ').toUpperCase()}</span>
      <span style="font-size: 13px; color: #64748B;">Channel: <strong>${escapeHtml(draft.channel)}</strong></span>
      <span style="font-size: 13px; color: #64748B;">Author: <strong>${escapeHtml(draft.creatorName)}</strong></span>
      <span style="font-size: 13px; color: #64748B;">Revision #${revisions.length}</span>
    </div>
    ${draft.intent ? `<p style="font-size: 13px; color: #334155; margin-top: 8px;"><strong>Stated Intent:</strong> "${escapeHtml(draft.intent)}"</p>` : ''}
  </div>

  <h2>1. Approved Content Body</h2>
  <div class="content-box">${escapeHtml(draft.content)}</div>

  <h2>2. Compliance Findings Summary (${findings.length} Total: ${acceptedCount} Accepted, ${rejectedCount} Rejected, ${openCount} Open)</h2>
  ${findings.map((f, i) => `
    <div class="finding-card sev-${f.severity}">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <div>
          <span class="badge sev-${f.severity}">${f.severity}</span>
          <span class="badge" style="background:#F1F5F9;color:#475569;">${f.category}</span>
          ${f.sourceId ? `<span class="badge" style="background:#EEF2FF;color:#4F46E5;">${f.sourceType.toUpperCase()}: ${f.sourceId}</span>` : ''}
          ${f.verifiedAgainst ? `<span class="badge" style="background:#ECFDF5;color:#065F46;">Verified against ${f.verifiedAgainst}</span>` : ''}
        </div>
        <span class="badge" style="background:#F1F5F9;color:#0F172A;">${f.status.toUpperCase()}</span>
      </div>
      <p style="margin:6px 0; font-size:14px;"><strong>Issue:</strong> ${escapeHtml(f.reason)}</p>
      ${f.sourceText ? `<div style="font-size:12px;color:#64748B;margin-bottom:6px;"><strong>Brand Source:</strong> ${escapeHtml(f.sourceText)}</div>` : ''}
      <div class="diff-box">
        <div><span style="color:#64748B;font-size:11px;font-weight:bold;">FLAGGED:</span> <span class="strike">${escapeHtml(f.quote)}</span></div>
        ${f.suggestion ? `<div><span style="color:#64748B;font-size:11px;font-weight:bold;">SUGGESTION:</span> <span class="highlight">${escapeHtml(f.suggestion)}</span></div>` : ''}
      </div>
      ${f.decidedBy ? `<div style="font-size:12px;color:#64748B;">Decided by <strong>${escapeHtml(f.decidedBy)}</strong> ${f.decisionNote ? `("${escapeHtml(f.decisionNote)}")` : ''}</div>` : ''}
    </div>
  `).join('')}

  <h2>3. Discussion & Review Comments</h2>
  ${comments.length === 0 ? '<p style="color:#64748B;">No discussion comments recorded.</p>' : comments.map(c => `
    <div class="comment">
      <div style="font-size:12px;font-weight:bold;color:#334155;margin-bottom:2px;">${escapeHtml(c.author)} (${c.authorRole}) &bull; ${new Date(c.createdAt).toLocaleString()}</div>
      <div style="font-size:14px;">${escapeHtml(c.text)}</div>
    </div>
  `).join('')}

  <h2>4. Complete Governance Audit Trail</h2>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Actor</th>
        <th>Role</th>
        <th>Action</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      ${auditLogs.map(l => `
        <tr>
          <td>${new Date(l.timestamp).toLocaleString()}</td>
          <td><strong>${escapeHtml(l.actor)}</strong></td>
          <td>${l.actorRole}</td>
          <td><span class="badge" style="background:#F1F5F9;color:#334155;">${l.action}</span></td>
          <td>${escapeHtml(l.details?.overrideReason ? 'OVERRIDE: ' + l.details.overrideReason : l.details?.comment || JSON.stringify(l.details || {}))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  generateMarkdownReport,
  generateHtmlReport
};
