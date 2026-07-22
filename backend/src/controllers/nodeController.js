// backend/src/controllers/nodeController.js
// Handles CRUD operations for nodes placed on floors

const Node = require('../models/Node');
const Floor = require('../models/Floor');
const Staircase = require('../models/Staircase');

// @desc    Get all nodes for a floor
// @route   GET /api/nodes/floor/:floorId
// @access  Public (for viewing) / Private (for editing, but we can keep public for end-users)
const getNodesByFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const nodes = await Node.find({ floorId })
      .populate('staircaseId');
    res.status(200).json({
      success: true,
      count: nodes.length,
      data: nodes,
    });
  } catch (error) {
    console.error('GetNodesByFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new node
// @route   POST /api/nodes
// @access  Private (admin only)
const createNode = async (req, res) => {
  try {
    const { floorId, type, label, x, y, properties } = req.body;

    if (!floorId || !type || x === undefined || y === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if floor exists
    const floor = await Floor.findById(floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // For staircase nodes, we may later need to link to a Staircase document
    // But we can create the node first, then staircaseController handles linking
    const node = await Node.create({
      floorId,
      type,
      label,
      x,
      y,
      properties: properties || {},
      // staircaseId will be set later during auto-linking
    });

    // Add node to floor's nodeIds array
    floor.nodeIds.push(node._id);
    await floor.save();

    res.status(201).json({
      success: true,
      data: node,
    });
  } catch (error) {
    console.error('CreateNode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a node
// @route   PUT /api/nodes/:id
// @access  Private (admin only)
const updateNode = async (req, res) => {
  try {
    const { label, x, y, type, properties, staircaseId } = req.body;
    const node = await Node.findById(req.params.id);

    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }

    if (label !== undefined) node.label = label;
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;
    if (type !== undefined) node.type = type;
    if (properties) node.properties = { ...node.properties, ...properties };
    if (staircaseId !== undefined) node.staircaseId = staircaseId;

    await node.save();

    res.status(200).json({
      success: true,
      data: node,
    });
  } catch (error) {
    console.error('UpdateNode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a node and its associated edges
// @route   DELETE /api/nodes/:id
// @access  Private (admin only)
const deleteNode = async (req, res) => {
  try {
    const node = await Node.findById(req.params.id);
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }

    // Remove node from floor's nodeIds
    await Floor.updateOne(
      { _id: node.floorId },
      { $pull: { nodeIds: node._id } }
    );

    // Delete all edges connected to this node
    const Edge = require('../models/Edge');
    await Edge.deleteMany({
      $or: [{ sourceNodeId: node._id }, { targetNodeId: node._id }],
    });

    // If this is a staircase node, remove it from staircase's nodeIdsPerFloor
    if (node.staircaseId) {
      const staircase = await Staircase.findById(node.staircaseId);
      if (staircase) {
        // Remove this floor's entry from the map
        const floorIdStr = node.floorId.toString();
        if (staircase.nodeIdsPerFloor.has(floorIdStr)) {
          staircase.nodeIdsPerFloor.delete(floorIdStr);
          await staircase.save();
        }
      }
    }

    await node.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    console.error('DeleteNode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single node by ID
// @route   GET /api/nodes/:id
// @access  Public
const getNodeById = async (req, res) => {
  try {
    const node = await Node.findById(req.params.id).populate('staircaseId');
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    res.status(200).json({
      success: true,
      data: node,
    });
  } catch (error) {
    console.error('GetNodeById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNodesByFloor,
  createNode,
  updateNode,
  deleteNode,
  getNodeById,
};