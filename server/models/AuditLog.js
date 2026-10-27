const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft' },
  action: { type: String, required: true },
  actor: { type: String, required: true },
  actorRole: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

AuditLogSchema.index({ workspaceId: 1, timestamp: -1 });
AuditLogSchema.index({ draftId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
