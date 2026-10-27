const mongoose = require('mongoose');

const FactSchema = new mongoose.Schema({
  factId: { type: String, required: true }, // e.g. F-01
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  statement: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

FactSchema.index({ workspaceId: 1, factId: 1 });

module.exports = mongoose.model('Fact', FactSchema);
