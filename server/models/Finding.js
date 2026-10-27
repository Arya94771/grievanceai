const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema({
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft', required: true },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Revision' },
  quote: { type: String, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  category: { type: String, required: true },
  severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  confidence: {
    type: String,
    enum: ['clear', 'possible', 'unverified'],
    default: 'possible'
  },
  sourceType: {
    type: String,
    enum: ['clause', 'fact', 'term', 'rule'],
    required: true
  },
  sourceId: { type: String, default: '' },
  sourceText: { type: String, default: '' },
  reason: { type: String, required: true },
  suggestion: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'accepted', 'rejected', 'disputed'],
    default: 'open'
  },
  decidedBy: { type: String, default: null },
  decidedAt: { type: Date, default: null },
  decisionNote: { type: String, default: '' },
  verifiedAgainst: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

FindingSchema.index({ draftId: 1, status: 1 });

module.exports = mongoose.model('Finding', FindingSchema);
