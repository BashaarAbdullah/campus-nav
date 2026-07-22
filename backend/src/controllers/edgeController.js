// backend/src/controllers/edgeController.js
// Handles CRUD operations for edges (walkable connections between nodes)

const Edge = require('../models/Edge');
const Node = require('../models/Node');
const Floor = require('../models/Floor');

// @desc    Get all edges for a floor
// @route   GET /api/edges/floor/:floorId
// @access  Public (for viewing)
const getEdgesByFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const edges = await Edge.find({ floorId })
      .populate('sourceNodeId targetNodeId');
    res.status(200).json({
      success: true,
      count: edges.length,
      data: edges,
    });
  } catch (error) {
    console.error('GetEdgesByFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new edge between two nodes on the same floor
// @route   POST /api/edges
// @access  Private (admin only)
const createEdge = async (req, res) => {
  try {
    const { sourceNodeId, targetNodeId, floorId, weight, bidirectional, properties } = req.body;

    if (!sourceNodeId || !targetNodeId || !floorId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if nodes exist and belong to the same floor
    const sourceNode = await Node.findById(sourceNodeId);
    const targetNode = await Node.findById(targetNodeId);
    if (!sourceNode || !targetNode) {
      return res.status(404).json({ message: 'One or both nodes not found' });
    }
    if (sourceNode.floorId.toString() !== floorId || targetNode.floorId.toString() !== floorId) {
      return res.status(400).json({ message: 'Both nodes must belong to the same floor' });
    }

    // Check if floor exists
    const floor = await Floor.findById(floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // Check for duplicate edge (same source-target on same floor)
    const existing = await Edge.findOne({ sourceNodeId, targetNodeId, floorId });
    if (existing) {
      return res.status(400).json({ message: 'Edge already exists between these nodes' });
    }

    // Also check reverse direction to avoid duplicates if bidirectional
    if (bidirectional !== false) {
      const reverse = await Edge.findOne({ sourceNodeId: targetNodeId, targetNodeId: sourceNodeId, floorId });
      if (reverse) {
        return res.status(400).json({ message: 'Reverse edge already exists (bidirectional)' });
      }
    }

    const edge = await Edge.create({
      sourceNodeId,
      targetNodeId,
      floorId,
      weight: weight || 1.0,
      bidirectional: bidirectional !== false,
      properties: properties || {},
    });

    res.status(201).json({
      success: true,
      data: edge,
    });
  } catch (error) {
    console.error('CreateEdge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update an edge
// @route   PUT /api/edges/:id
// @access  Private (admin only)
const updateEdge = async (req, res) => {
  try {
    const { weight, bidirectional, properties } = req.body;
    const edge = await Edge.findById(req.params.id);
    if (!edge) {
      return res.status(404).json({ message: 'Edge not found' });
    }

    if (weight !== undefined) edge.weight = weight;
    if (bidirectional !== undefined) edge.bidirectional = bidirectional;
    if (properties) edge.properties = { ...edge.properties, ...properties };

    await edge.save();

    res.status(200).json({
      success: true,
      data: edge,
    });
  } catch (error) {
    console.error('UpdateEdge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an edge
// @route   DELETE /api/edges/:id
// @access  Private (admin only)
const deleteEdge = async (req, res) => {
  try {
    const edge = await Edge.findById(req.params.id);
    if (!edge) {
      return res.status(404).json({ message: 'Edge not found' });
    }

    await edge.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Edge deleted successfully',
    });
  } catch (error) {
    console.error('DeleteEdge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete all edges for a floor (bulk clear)
// @route   DELETE /api/edges/floor/:floorId
// @access  Private (admin only)
const deleteEdgesByFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const result = await Edge.deleteMany({ floorId });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} edges`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('DeleteEdgesByFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getEdgesByFloor,
  createEdge,
  updateEdge,
  deleteEdge,
  deleteEdgesByFloor,
};