// backend/src/models/Edge.js
// Edge schema – represents a walkable connection between two nodes on the same floor

const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema(
  {
    sourceNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true,
    },
    targetNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
    },
    weight: {
      type: Number,
      default: 1.0,
      min: 0,
      // Weight can represent distance, time, or any cost metric
    },
    // Optional: bidirectional flag (default true, but could be one-way)
    bidirectional: {
      type: Boolean,
      default: true,
    },
    // Metadata about the edge (e.g., corridor width, accessibility)
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Ensure no duplicate edges between the same nodes on the same floor
EdgeSchema.index(
  { sourceNodeId: 1, targetNodeId: 1, floorId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Edge', EdgeSchema);