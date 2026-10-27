const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['creator', 'manager', 'reviewer', 'admin'],
    required: true,
    default: 'creator'
  },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
