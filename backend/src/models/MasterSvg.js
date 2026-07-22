// backend/src/models/MasterSvg.js
// MasterSvg schema – stores the campus overview SVG and region mappings to buildings

const mongoose = require('mongoose');

const MasterSvgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Campus Overview',
      trim: true,
    },
    // The full SVG string for the campus map
    svgData: {
      type: String,
      required: true,
    },
    // Region definitions: maps a region identifier (e.g., SVG element ID) to a building ID
    regions: [
      {
        regionId: {
          type: String,
          required: true,
          trim: true,
          // e.g., "building-a-rect", "building-b-path"
        },
        buildingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Building',
        },
        // Optional: store the SVG element's bounding box or transform data
        boundingBox: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        // Additional metadata like color, label position
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    // Metadata about the SVG (dimensions, etc.)
    metadata: {
      width: Number,
      height: Number,
      viewBox: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MasterSvg', MasterSvgSchema);