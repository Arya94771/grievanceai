const mongoose = require('mongoose');

const AiUseLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft' },
  model: { type: String, required: true },
  whatWasSent: { type: String, required: true },
  redactionsApplied: [{ type: String }],
  tokensUsed: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

AiUseLogSchema.index({ draftId: 1, timestamp: -1 });

module.exports = mongoose.model('AiUseLog', AiUseLogSchema);
