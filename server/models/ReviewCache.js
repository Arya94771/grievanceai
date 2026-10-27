const mongoose = require('mongoose');

const ReviewCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true }, // sha256 hash
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft' },
  findings: [{ type: mongoose.Schema.Types.Mixed }],
  aiUsed: { type: Boolean, default: true },
  isPrecomputedSample: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index is covered by unique: true on cacheKey
module.exports = mongoose.model('ReviewCache', ReviewCacheSchema);
