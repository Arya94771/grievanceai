const mongoose = require('mongoose');

const ClauseSchema = new mongoose.Schema({
  clauseId: { type: String, required: true }, // e.g. G-01
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  text: { type: String, required: true },
  category: {
    type: String,
    enum: ['tone', 'terminology', 'messaging', 'accessibility', 'claims', 'visual'],
    required: true
  },
  severity: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  createdAt: { type: Date, default: Date.now }
});

ClauseSchema.index({ workspaceId: 1, clauseId: 1 });

module.exports = mongoose.model('Clause', ClauseSchema);
