// backend/src/models/Building.js
// Building schema – stores building metadata and reference to master SVG region

const mongoose = require('mongoose');

const BuildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    floors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Floor',
      },
    ],
    masterSvgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterSvg',
    },
    // For linking to master SVG regions: store region identifier (e.g., shape ID or bounding box)
    masterRegionId: {
      type: String,
      trim: true,
    },
    // Optional: coordinates/region on master SVG for clickable area
    regionData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Building', BuildingSchema);