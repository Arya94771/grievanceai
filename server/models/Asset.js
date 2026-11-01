const mongoose = require('mongoose');

const PaletteColorSchema = new mongoose.Schema({
  hex: { type: String, required: true },
  name: { type: String, default: '' },
  tolerance: { type: Number, default: 12 }, // Delta E threshold
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const AssetSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['logo', 'palette', 'font', 'imagery-rule', 'general'],
    default: 'general'
  },
  usageRule: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
  aspectRatio: { type: Number, default: null }, // width / height
  minWidthPercent: { type: Number, default: 8 }, // Min % of creative width
  clearSpaceRule: { type: String, default: '0.5x clear space around logo' },
  forbiddenTreatments: [{ type: String }], // 'recoloured', 'stretched', 'rotated', 'cropped', 'low-contrast'
  palette: [PaletteColorSchema], // Approved brand colors for palette asset
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Asset', AssetSchema);
