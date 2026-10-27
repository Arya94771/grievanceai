const mongoose = require('mongoose');

const DraftSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  channel: { type: String, default: 'General' },
  intent: { type: String, default: '' },
  content: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'in_review', 'changes_requested', 'approved'],
    default: 'draft'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorName: { type: String, default: 'Creator' },
  currentRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Revision' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DraftSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('Draft', DraftSchema);
