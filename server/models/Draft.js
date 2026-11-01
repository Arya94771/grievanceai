const mongoose = require('mongoose');

const CreativeSchema = new mongoose.Schema({
  url: { type: String, required: true },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  hash: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
});

const DraftSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  channel: { type: String, default: 'General' },
  intent: { type: String, default: '' },
  content: { type: String, required: true },
  creatives: [CreativeSchema], // Uploaded marketing visuals / creatives (V1)
  status: {
    type: String,
    enum: ['draft', 'in_review', 'changes_requested', 'approved'],
    default: 'draft'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorName: { type: String, default: 'Creator' },
  currentRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Revision' },
  version: { type: Number, default: 1 }, // Optimistic locking
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DraftSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('Draft', DraftSchema);
