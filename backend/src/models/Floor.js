// backend/src/models/Floor.js
// Floor schema – stores SVG data, floor number, and references to nodes on this floor

const mongoose = require('mongoose');

const FloorSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    floorNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    // Store the SVG content as a string (or Buffer if large)
    svgData: {
      type: String,
      required: true,
    },
    // References to Node documents placed on this floor
    nodeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Node',
      },
    ],
    // Optional metadata about the SVG (dimensions, etc.)
    metadata: {
      width: Number,
      height: Number,
      viewBox: String,
    },
  },
  { timestamps: true }
);

// Ensure a building can't have duplicate floor numbers
FloorSchema.index({ buildingId: 1, floorNumber: 1 }, { unique: true });

module.exports = mongoose.model('Floor', FloorSchema);