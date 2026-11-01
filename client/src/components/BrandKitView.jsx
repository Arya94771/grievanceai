import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, 
  FileText, Tag, Image as ImageIcon, Copy, AlertTriangle, ArrowRight, X,
  Palette, Sliders, Upload, Check, Eye
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

  // Visual Asset Modals (V2)
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [logoUsageRule, setLogoUsageRule] = useState('');
  const [logoMinWidth, setLogoMinWidth] = useState(8);
  const [logoClearSpace, setLogoClearSpace] = useState('0.5x clear space around logo boundary');
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [submittingLogo, setSubmittingLogo] = useState(false);

  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [paletteName, setPaletteName] = useState('Primary Brand Palette');
  const [paletteUsageRule, setPaletteUsageRule] = useState('Approved corporate colors for marketing collateral.');
  const [paletteColors, setPaletteColors] = useState([
    { hex: '#1B4332', name: 'Forest Reserve Green', tolerance: 12, isPrimary: true },
    { hex: '#D4A373', name: 'Artisan Roast Amber', tolerance: 12, isPrimary: false },
    { hex: '#FAEDCD', name: 'Foam Cream', tolerance: 12, isPrimary: false }
  ]);
  const [newColorHex, setNewColorHex] = useState('#2D6A4F');
  const [newColorName, setNewColorName] = useState('');
  const [newColorTolerance, setNewColorTolerance] = useState(12);

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

  // Handle Upload Approved Logo (V2)
  async function handleLogoUploadSubmit(e) {
    e.preventDefault();
    if (!selectedLogoFile || !logoName.trim()) {
      alert('Logo name and file are required.');
      return;
    }

    try {
      setSubmittingLogo(true);
      const fd = new FormData();
      fd.append('name', logoName.trim());
      fd.append('usageRule', logoUsageRule.trim());
      fd.append('minWidthPercent', logoMinWidth);
      fd.append('clearSpaceRule', logoClearSpace.trim());
      fd.append('logo', selectedLogoFile);

      const res = await fetch('/api/brand-kit/assets/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload logo');

      showNotification(`Approved logo "${json.name}" uploaded successfully.`);
      setShowLogoModal(false);
      setLogoName('');
      setLogoUsageRule('');
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      fetchBrandKit();
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setSubmittingLogo(false);
    }
  }

  // Handle Save Brand Palette (V2)
  async function handlePaletteSubmit(e) {
    e.preventDefault();
    if (!paletteName.trim() || paletteColors.length === 0) {
      alert('Palette name and at least one color swatch are required.');
      return;
    }

    try {
      const res = await fetch('/api/brand-kit/assets/palette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: paletteName.trim(),
          usageRule: paletteUsageRule.trim(),
          palette: paletteColors
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save palette');

      showNotification(`Palette "${json.name}" saved successfully.`);
      setShowPaletteModal(false);
      fetchBrandKit();
    } catch (err) {
      alert(`Palette save error: ${err.message}`);
    }
  }

  function handleAddColorSwatch() {
    if (!/^#[0-9A-F]{6}$/i.test(newColorHex)) {
      alert('Please enter a valid 6-digit hex color code (e.g. #1B4332).');
      return;
    }
    setPaletteColors([
      ...paletteColors,
      {
        hex: newColorHex.toUpperCase(),
        name: newColorName.trim() || 'Accent Color',
        tolerance: Number(newColorTolerance) || 12,
        isPrimary: paletteColors.length === 0
      }
    ]);
    setNewColorName('');
  }

  function handleRemoveColorSwatch(index) {
    setPaletteColors(paletteColors.filter((_, i) => i !== index));
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
          <h1 className="page-title">Brand Kit &amp; Governance Rules</h1>
          <p className="page-subtitle">
            Organization source of truth for Brewline Coffee Co. Every clause, approved fact, banned term, logo, and palette rule here is verified against drafts in real time.
          </p>
        </div>

        {isAdmin && (
          <div className="admin-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setShowPasteModal(true)}>
              <Copy size={15} /> Paste Guidelines (Auto-Split)
            </button>
            {activeTab === 'clauses' && (
              <button className="btn btn-primary" onClick={() => openAddModal('clause')}>
                <Plus size={15} /> Add Clause
              </button>
            )}
            {activeTab === 'facts' && (
              <button className="btn btn-primary" onClick={() => openAddModal('fact')}>
                <Plus size={15} /> Add Fact
              </button>
            )}
            {activeTab === 'terms' && (
              <button className="btn btn-primary" onClick={() => openAddModal('term')}>
                <Plus size={15} /> Add Term
              </button>
            )}
            {activeTab === 'assets' && (
              <>
                <button className="btn btn-primary" onClick={() => setShowLogoModal(true)}>
                  <Upload size={15} /> Upload Approved Logo
                </button>
                <button className="btn btn-outline" onClick={() => setShowPaletteModal(true)}>
                  <Palette size={15} /> Add Brand Palette
                </button>
                <button className="btn btn-outline" onClick={() => openAddModal('asset')}>
                  <Plus size={15} /> Add Usage Rule
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="brand-tabs">
        <button 
          className={`brand-tab ${activeTab === 'clauses' ? 'active' : ''}`}
          onClick={() => setActiveTab('clauses')}
        >
          <FileText size={16} /> Brand Clauses ({data.clauses?.length || 0})
        </button>
        <button 
          className={`brand-tab ${activeTab === 'facts' ? 'active' : ''}`}
          onClick={() => setActiveTab('facts')}
        >
          <CheckCircle size={16} /> Approved Facts ({data.facts?.length || 0})
        </button>
        <button 
          className={`brand-tab ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          <Tag size={16} /> Brand Terminology ({data.terms?.length || 0})
        </button>
        <button 
          className={`brand-tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <ImageIcon size={16} /> Brand Visuals &amp; Palette ({data.assets?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="brand-panel">
        {loading ? (
          <div className="loading-state">Loading brand kit rules...</div>
        ) : (
          <>
            {/* 1. CLAUSES TAB */}
            {activeTab === 'clauses' && (
              <div className="clauses-grid">
                {data.clauses?.map((clause) => (
                  <div key={clause._id} className="clause-card">
                    <div className="clause-card-header">
                      <div className="clause-id-badge">
                        <span className="badge badge-id">{clause.clauseId}</span>
                        <span className={`badge badge-${clause.severity}`}>{clause.severity}</span>
                        <span className="badge badge-category">{clause.category}</span>
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
                    <div className="clause-text">{clause.text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. FACTS TAB */}
            {activeTab === 'facts' && (
              <div className="facts-grid">
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

            {/* 4. ASSETS & VISUALS TAB (V2) */}
            {activeTab === 'assets' && (
              <div className="assets-grid">
                {data.assets?.map((asset) => (
                  <div key={asset._id} className="asset-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="asset-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${asset.type === 'logo' ? 'badge-primary' : asset.type === 'palette' ? 'badge-warning' : 'badge-category'}`}>
                          {(asset.type || 'general').toUpperCase()}
                        </span>
                        <div className="asset-name" style={{ fontWeight: 700 }}>{asset.name}</div>
                      </div>
                      {isAdmin && (
                        <div className="card-actions">
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

                    {/* Logo Visual Preview */}
                    {asset.type === 'logo' && (
                      <div className="asset-logo-preview-box" style={{
                        background: '#F8FAFC',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '120px'
                      }}>
                        {asset.imageUrl ? (
                          <img 
                            src={asset.imageUrl} 
                            alt={asset.name} 
                            style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Logo graphic saved in brand master</div>
                        )}
                      </div>
                    )}

                    {/* Logo Geometry Rules */}
                    {asset.type === 'logo' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                        {asset.aspectRatio && (
                          <span className="badge badge-outline">
                            Aspect Ratio: {asset.aspectRatio.toFixed(2)}
                          </span>
                        )}
                        <span className="badge badge-outline">
                          Min Width: {asset.minWidthPercent || 8}%
                        </span>
                        <span className="badge badge-outline">
                          {asset.clearSpaceRule || '0.5x clear space'}
                        </span>
                      </div>
                    )}

                    {/* Palette Swatches */}
                    {asset.type === 'palette' && asset.palette && asset.palette.length > 0 && (
                      <div className="palette-swatches-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {asset.palette.map((color, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#F8FAFC',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                backgroundColor: color.hex,
                                border: '1px solid rgba(0,0,0,0.15)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{color.name || color.hex}</div>
                                <code style={{ fontSize: '0.75rem', color: '#64748B' }}>{color.hex}</code>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {color.isPrimary && <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Primary</span>}
                              <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                                &Delta;E &le; {color.tolerance || 12}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="asset-rule" style={{ fontSize: '0.85rem', color: '#475569' }}>
                      <strong>Rule:</strong> {asset.usageRule}
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
                  Split &amp; Import Clauses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Approved Logo Modal (V2) */}
      {showLogoModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-header">
              <h2><Upload size={20} /> Upload Approved Brand Logo</h2>
              <button className="icon-btn" onClick={() => setShowLogoModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleLogoUploadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Logo Asset Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Brewline Primary Logo Mark"
                    value={logoName}
                    onChange={(e) => setLogoName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Logo Image File (PNG, JPG, or SVG)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setSelectedLogoFile(file);
                        setLogoPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    required
                  />
                  <small className="text-muted">Max 4 MB. SVGs uploaded by Admin are automatically rasterized securely.</small>
                </div>

                {logoPreviewUrl && (
                  <div style={{ textAlign: 'center', padding: '12px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '14px' }}>
                    <img src={logoPreviewUrl} alt="Logo Preview" style={{ maxHeight: '70px', maxWidth: '100%' }} />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Min Size (% of Creative Width)</label>
                    <input
                      type="number"
                      min={3}
                      max={50}
                      className="form-control"
                      value={logoMinWidth}
                      onChange={(e) => setLogoMinWidth(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Clear-Space Rule</label>
                    <input
                      type="text"
                      className="form-control"
                      value={logoClearSpace}
                      onChange={(e) => setLogoClearSpace(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Usage Rule &amp; Restrictions</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Must maintain aspect ratio. Never recolor or place on low-contrast backgrounds..."
                    value={logoUsageRule}
                    onChange={(e) => setLogoUsageRule(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowLogoModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingLogo}>
                  {submittingLogo ? 'Uploading...' : 'Save Approved Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Palette Modal (V2) */}
      {showPaletteModal && (
        <div className="modal-backdrop">
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h2><Palette size={20} /> Configure Brand Color Palette</h2>
              <button className="icon-btn" onClick={() => setShowPaletteModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePaletteSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Palette Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={paletteName}
                    onChange={(e) => setPaletteName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Usage Guideline</label>
                  <input
                    type="text"
                    className="form-control"
                    value={paletteUsageRule}
                    onChange={(e) => setPaletteUsageRule(e.target.value)}
                  />
                </div>

                {/* Swatches List */}
                <div className="form-group">
                  <label>Approved Brand Swatches ({paletteColors.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {paletteColors.map((color, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: '#F1F5F9',
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: color.hex, border: '1px solid rgba(0,0,0,0.2)' }} />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{color.name}</span>
                          <code style={{ fontSize: '0.8rem' }}>{color.hex}</code>
                          <span className="badge badge-outline">&Delta;E &le; {color.tolerance}</span>
                          {color.isPrimary && <span className="badge badge-primary">Primary</span>}
                        </div>
                        <button type="button" className="icon-btn text-danger" onClick={() => handleRemoveColorSwatch(idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swatch Adder */}
                <div style={{
                  padding: '12px',
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>Add New Color Swatch:</div>
                  <div className="form-row" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: '0 0 70px' }}>
                      <label>Color</label>
                      <input 
                        type="color" 
                        value={newColorHex} 
                        onChange={(e) => setNewColorHex(e.target.value)}
                        style={{ height: '38px', width: '100%', padding: '2px', cursor: 'pointer' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: '0 0 100px' }}>
                      <label>Hex Code</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={newColorHex} 
                        onChange={(e) => setNewColorHex(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Color Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Forest Green"
                        value={newColorName} 
                        onChange={(e) => setNewColorName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: '0 0 110px' }}>
                      <label>&Delta;E Tolerance: {newColorTolerance}</label>
                      <input 
                        type="range" 
                        min={5} 
                        max={30} 
                        value={newColorTolerance} 
                        onChange={(e) => setNewColorTolerance(Number(e.target.value))}
                        style={{ width: '100%', marginTop: '8px' }}
                      />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={handleAddColorSwatch} style={{ marginBottom: '14px' }}>
                      <Plus size={15} /> Add Swatch
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPaletteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Color Palette
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
