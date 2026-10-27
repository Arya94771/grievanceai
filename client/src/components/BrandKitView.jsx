import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, 
  FileText, Tag, Image, Copy, AlertTriangle, ArrowRight, X 
} from 'lucide-react';

export default function BrandKitView({ token, user }) {
  const [activeTab, setActiveTab] = useState('clauses');
  const [data, setData] = useState({ clauses: [], facts: [], terms: [], assets: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & form state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pasteCategory, setPasteCategory] = useState('messaging');
  const [pasteSeverity, setPasteSeverity] = useState('medium');

  const [showItemModal, setShowItemModal] = useState(false);
  const [modalType, setModalType] = useState('clause'); // 'clause' | 'fact' | 'term' | 'asset'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    fetchBrandKit();
  }, [token]);

  async function fetchBrandKit() {
    try {
      setLoading(true);
      const res = await fetch('/api/brand-kit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load brand kit');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  // Handle Paste Guidelines
  async function handleBatchImport(e) {
    e.preventDefault();
    if (!pastedText.trim()) return;

    try {
      const res = await fetch('/api/brand-kit/clauses/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rawText: pastedText,
          defaultCategory: pasteCategory,
          defaultSeverity: pasteSeverity
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to import guidelines');

      showNotification(`Successfully imported ${resData.clauses?.length || 'new'} clauses!`);
      setPastedText('');
      setShowPasteModal(false);
      fetchBrandKit();
    } catch (err) {
      alert(`Import error: ${err.message}`);
    }
  }

  // Handle Delete
  async function handleDelete(type, id) {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const endpoint = `/api/brand-kit/${type}s/${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to delete');
      }
      showNotification(`${type.toUpperCase()} deleted.`);
      fetchBrandKit();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  // Handle Save (Add/Edit)
  async function handleSaveItem(e) {
    e.preventDefault();
    const isEdit = !!editingItem;
    const endpoint = isEdit
      ? `/api/brand-kit/${modalType}s/${editingItem._id}`
      : `/api/brand-kit/${modalType}s`;

    try {
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to save item');

      showNotification(`${modalType.toUpperCase()} saved successfully.`);
      setShowItemModal(false);
      setEditingItem(null);
      setFormData({});
      fetchBrandKit();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    }
  }

  function openEditModal(type, item) {
    setModalType(type);
    setEditingItem(item);
    if (type === 'clause') {
      setFormData({ clauseId: item.clauseId, text: item.text, category: item.category, severity: item.severity });
    } else if (type === 'fact') {
      setFormData({ factId: item.factId, statement: item.statement });
    } else if (type === 'term') {
      setFormData({ preferred: item.preferred, banned: item.banned.join(', '), note: item.note || '' });
    } else if (type === 'asset') {
      setFormData({ name: item.name, usageRule: item.usageRule });
    }
    setShowItemModal(true);
  }

  function openAddModal(type) {
    setModalType(type);
    setEditingItem(null);
    if (type === 'clause') {
      const nextNum = (data.clauses?.length || 0) + 1;
      setFormData({
        clauseId: `G-${String(nextNum).padStart(2, '0')}`,
        text: '',
        category: 'messaging',
        severity: 'medium'
      });
    } else if (type === 'fact') {
      const nextNum = (data.facts?.length || 0) + 1;
      setFormData({
        factId: `F-${String(nextNum).padStart(2, '0')}`,
        statement: ''
      });
    } else if (type === 'term') {
      setFormData({ preferred: '', banned: '', note: '' });
    } else if (type === 'asset') {
      setFormData({ name: '', usageRule: '' });
    }
    setShowItemModal(true);
  }

  return (
    <div className="brand-kit-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand Governance Kit</h1>
          <p className="page-subtitle">
            {data.workspace?.name || 'Brewline Coffee Co.'} &bull; v{data.workspace?.version || 1} &bull; Canonical rules, facts, terminology & assets.
          </p>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button 
                className="btn btn-outline"
                onClick={() => setShowPasteModal(true)}
              >
                <Copy size={16} /> Paste Guidelines
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => openAddModal(activeTab === 'clauses' ? 'clause' : activeTab === 'facts' ? 'fact' : activeTab === 'terms' ? 'term' : 'asset')}
              >
                <Plus size={16} /> Add {activeTab.slice(0, -1)}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role notice */}
      {!isAdmin && (
        <div className="info-banner">
          <BookOpen size={18} />
          <span>
            Viewing in <strong>Read-Only</strong> mode as <strong>{user?.role}</strong>. Only <strong>Brand Administrators</strong> can add, edit, or delete governance rules.
          </span>
        </div>
      )}

      {successMsg && (
        <div className="success-banner">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'clauses' ? 'active' : ''}`}
          onClick={() => setActiveTab('clauses')}
        >
          <FileText size={16} /> Clauses ({data.clauses?.length || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'facts' ? 'active' : ''}`}
          onClick={() => setActiveTab('facts')}
        >
          <CheckCircle size={16} /> Verified Facts ({data.facts?.length || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          <Tag size={16} /> Terminology ({data.terms?.length || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Image size={16} /> Assets ({data.assets?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading ? (
          <div className="loading-state">Loading brand kit rules...</div>
        ) : error ? (
          <div className="error-card">{error}</div>
        ) : (
          <>
            {/* 1. CLAUSES TAB */}
            {activeTab === 'clauses' && (
              <div className="rules-grid">
                {data.clauses?.map((clause) => (
                  <div key={clause._id} className="rule-card">
                    <div className="rule-card-header">
                      <div className="rule-id-badges">
                        <span className="badge badge-id">{clause.clauseId}</span>
                        <span className={`badge badge-category cat-${clause.category}`}>
                          {clause.category}
                        </span>
                        <span className={`badge badge-severity sev-${clause.severity}`}>
                          {clause.severity}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="card-actions">
                          <button 
                            className="icon-btn" 
                            title="Edit"
                            onClick={() => openEditModal('clause', clause)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="icon-btn text-danger" 
                            title="Delete"
                            onClick={() => handleDelete('clause', clause._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="rule-text">{clause.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 2. FACTS TAB */}
            {activeTab === 'facts' && (
              <div className="facts-list">
                {data.facts?.map((fact) => (
                  <div key={fact._id} className="fact-card">
                    <div className="fact-badge">
                      <span className="badge badge-id">{fact.factId}</span>
                    </div>
                    <div className="fact-statement">{fact.statement}</div>
                    {isAdmin && (
                      <div className="card-actions">
                        <button 
                          className="icon-btn" 
                          title="Edit"
                          onClick={() => openEditModal('fact', fact)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          className="icon-btn text-danger" 
                          title="Delete"
                          onClick={() => handleDelete('fact', fact._id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 3. TERMS TAB */}
            {activeTab === 'terms' && (
              <div className="terms-grid">
                {data.terms?.map((term) => (
                  <div key={term._id} className="term-card">
                    <div className="term-card-header">
                      <div className="term-preferred-label">PREFERRED</div>
                      {isAdmin && (
                        <div className="card-actions">
                          <button 
                            className="icon-btn" 
                            title="Edit"
                            onClick={() => openEditModal('term', term)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="icon-btn text-danger" 
                            title="Delete"
                            onClick={() => handleDelete('term', term._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="term-preferred-text">{term.preferred}</div>
                    <div className="term-banned-section">
                      <div className="term-banned-label">BANNED VARIANTS</div>
                      <div className="banned-tags">
                        {term.banned?.map((b, i) => (
                          <span key={i} className="banned-tag">&times; {b}</span>
                        ))}
                      </div>
                    </div>
                    {term.note && <div className="term-note">{term.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* 4. ASSETS TAB */}
            {activeTab === 'assets' && (
              <div className="assets-grid">
                {data.assets?.map((asset) => (
                  <div key={asset._id} className="asset-card">
                    <div className="asset-card-header">
                      <div className="asset-name">{asset.name}</div>
                      {isAdmin && (
                        <div className="card-actions">
                          <button 
                            className="icon-btn" 
                            title="Edit"
                            onClick={() => openEditModal('asset', asset)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="icon-btn text-danger" 
                            title="Delete"
                            onClick={() => handleDelete('asset', asset._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="asset-rule">
                      <strong>Usage Rule:</strong> {asset.usageRule}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Paste Guidelines Modal */}
      {showPasteModal && (
        <div className="modal-backdrop">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h2><Copy size={20} /> Paste Guidelines to Auto-Split</h2>
              <button className="icon-btn" onClick={() => setShowPasteModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleBatchImport}>
              <div className="modal-body">
                <p className="modal-hint">
                  Paste your raw brand guidelines or policies below. The system automatically detects numbered lists (e.g. <code>1. ...</code>, <code>G-01 ...</code>, or line breaks) and splits them into numbered, editable clauses.
                </p>
                <div className="form-group">
                  <label>Pasted Guidelines Text</label>
                  <textarea
                    rows={8}
                    className="form-control"
                    placeholder="1. Always emphasize fair grower compensation.&#10;2. Never use aggressive urgency tricks.&#10;3. State harvest altitude on all retail bags."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Default Category</label>
                    <select 
                      className="form-control"
                      value={pasteCategory}
                      onChange={(e) => setPasteCategory(e.target.value)}
                    >
                      <option value="messaging">Messaging</option>
                      <option value="tone">Tone</option>
                      <option value="terminology">Terminology</option>
                      <option value="accessibility">Accessibility</option>
                      <option value="claims">Claims</option>
                      <option value="visual">Visual</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Default Severity</label>
                    <select 
                      className="form-control"
                      value={pasteSeverity}
                      onChange={(e) => setPasteSeverity(e.target.value)}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPasteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Split & Import Clauses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit' : 'Add'} {modalType.toUpperCase()}</h2>
              <button className="icon-btn" onClick={() => setShowItemModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                {modalType === 'clause' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Clause ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.clauseId || ''}
                          onChange={(e) => setFormData({ ...formData, clauseId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <select
                          className="form-control"
                          value={formData.category || 'messaging'}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                          <option value="tone">Tone</option>
                          <option value="terminology">Terminology</option>
                          <option value="messaging">Messaging</option>
                          <option value="accessibility">Accessibility</option>
                          <option value="claims">Claims</option>
                          <option value="visual">Visual</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Severity</label>
                        <select
                          className="form-control"
                          value={formData.severity || 'medium'}
                          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Clause Rule Text</label>
                      <textarea
                        rows={4}
                        className="form-control"
                        value={formData.text || ''}
                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                {modalType === 'fact' && (
                  <>
                    <div className="form-group">
                      <label>Fact ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.factId || ''}
                        onChange={(e) => setFormData({ ...formData, factId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Verified Fact Statement</label>
                      <textarea
                        rows={4}
                        className="form-control"
                        placeholder="State verified pricing, dates, altitude, or certifications..."
                        value={formData.statement || ''}
                        onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                {modalType === 'term' && (
                  <>
                    <div className="form-group">
                      <label>Preferred Term</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., accessible luxury"
                        value={formData.preferred || ''}
                        onChange={(e) => setFormData({ ...formData, preferred: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Banned Variants (comma separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., cheap, bargain, budget"
                        value={formData.banned || ''}
                        onChange={(e) => setFormData({ ...formData, banned: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Guidance Note (optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Why this replacement matters..."
                        value={formData.note || ''}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {modalType === 'asset' && (
                  <>
                    <div className="form-group">
                      <label>Asset Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Primary Wordmark Logo"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Usage Rule</label>
                      <textarea
                        rows={3}
                        className="form-control"
                        placeholder="Minimum clear space, permitted background colors, restrictions..."
                        value={formData.usageRule || ''}
                        onChange={(e) => setFormData({ ...formData, usageRule: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowItemModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
