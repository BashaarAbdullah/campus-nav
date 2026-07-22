// backend/src/models/Staircase.js
// Staircase schema – represents a physical staircase spanning multiple floors in a building

const mongoose = require('mongoose');

const StaircaseSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g., "North", "South", "Main"
    },
    // Map from floor number to Node ID for that floor's staircase node
    nodeIdsPerFloor: {
      type: Map,
      of: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true,
      // e.g., { "1": nodeId1, "2": nodeId2, "3": nodeId3 }
    },
    // Position tolerance used during auto-matching (can override global default)
    tolerance: {
      type: Number,
      default: 10, // in SVG coordinate units
    },
    // Optional: description or location notes
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure unique (buildingId + name) combination
StaircaseSchema.index({ buildingId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Staircase', StaircaseSchema);