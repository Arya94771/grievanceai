const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Draft', required: true },
  findingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
  author: { type: String, required: true },
  authorRole: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

CommentSchema.index({ draftId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
