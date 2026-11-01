const mongoose = require('mongoose');

const RegionSchema = new mongoose.Schema({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  w: { type: Number, default: 0 },
  h: { type: Number, default: 0 }
}, { _id: false });

const FindingSchema = new mongoose.Schema({
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft', required: true },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Revision' },
  mediaType: { type: String, enum: ['text', 'image'], default: 'text' }, // V1 extension
  creativeId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Reference to draft.creatives
  region: { type: RegionSchema, default: null }, // Normalized 0..1000 bounding box
  evidenceCropId: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS crop ID
  approvedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
  measured: { type: mongoose.Schema.Types.Mixed, default: {} }, // Measured deltaE, aspect ratios, etc.
  quote: { type: String, required: true },
  start: { type: Number, default: 0 },
  end: { type: Number, default: 0 },
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
  version: { type: Number, default: 1 }, // Optimistic locking
  createdAt: { type: Date, default: Date.now }
});

FindingSchema.index({ draftId: 1, status: 1 });
FindingSchema.index({ mediaType: 1 });

module.exports = mongoose.model('Finding', FindingSchema);
