const mongoose = require('mongoose');

const TermSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  preferred: { type: String, required: true },
  banned: [{ type: String, required: true }],
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

TermSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('Term', TermSchema);
