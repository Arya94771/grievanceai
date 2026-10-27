const mongoose = require('mongoose');

const RevisionSchema = new mongoose.Schema({
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft', required: true },
  revisionNumber: { type: Number, default: 1 },
  content: { type: String, required: true },
  author: { type: String, default: 'Creator' },
  authorRole: { type: String, default: 'creator' },
  note: { type: String, default: 'Initial revision' },
  createdAt: { type: Date, default: Date.now }
});

RevisionSchema.index({ draftId: 1, revisionNumber: 1 });

module.exports = mongoose.model('Revision', RevisionSchema);
