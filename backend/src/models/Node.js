// backend/src/models/Node.js
// Node schema – represents a point on a floor (room, staircase, or junction/corridor)

const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
    },
    type: {
      type: String,
      enum: ['room', 'staircase', 'junction'],
      required: true,
    },
    label: {
      type: String,
      trim: true,
      // For rooms: e.g., "Room 101", "Lab 2"
      // For staircases: e.g., "North Staircase"
      // For junctions: optional label (could be empty)
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    // For staircase nodes: reference to the Staircase document
    staircaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staircase',
    },
    // Additional properties
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // e.g., for rooms: capacity, department, etc.
    },
  },
  { timestamps: true }
);

// Index for quick lookups by floor
NodeSchema.index({ floorId: 1 });

module.exports = mongoose.model('Node', NodeSchema);