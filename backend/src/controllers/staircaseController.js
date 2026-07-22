// backend/src/controllers/staircaseController.js
// Handles staircase operations: auto-linking across floors, CRUD, and matching logic

const Staircase = require('../models/Staircase');
const Node = require('../models/Node');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const { DEFAULT_STAIRCASE_TOLERANCE } = require('../utils/constants');

// @desc    Get all staircases for a building
// @route   GET /api/staircases/building/:buildingId
// @access  Public (for viewing) / Private (admin)
const getStaircasesByBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const staircases = await Staircase.find({ buildingId });
    res.status(200).json({
      success: true,
      count: staircases.length,
      data: staircases,
    });
  } catch (error) {
    console.error('GetStaircasesByBuilding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Auto-link staircase nodes across floors for a building
// @route   POST /api/staircases/building/:buildingId/auto-link
// @access  Private (admin only)
const autoLinkStaircases = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { tolerance } = req.body; // optional override

    // Get all floors for this building
    const floors = await Floor.find({ buildingId }).sort({ floorNumber: 1 });
    if (floors.length === 0) {
      return res.status(400).json({ message: 'No floors found for this building' });
    }

    // Get all staircase nodes across all floors of this building
    const floorIds = floors.map(f => f._id);
    const staircaseNodes = await Node.find({
      floorId: { $in: floorIds },
      type: 'staircase',
    });

    if (staircaseNodes.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No staircase nodes found to link',
        linked: 0,
      });
    }

    // Group nodes by approximate position (using clustering)
    // We'll use a simple grouping: for each node, find others within tolerance distance
    const usedNodes = new Set();
    const linkedCount = 0;
    const createdStaircases = [];

    const toleranceVal = tolerance || DEFAULT_STAIRCASE_TOLERANCE;

    // Helper to calculate Euclidean distance
    const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

    // Iterate over all staircase nodes
    for (const node of staircaseNodes) {
      if (usedNodes.has(node._id.toString())) continue;

      // Find all nodes within tolerance distance (on different floors)
      const matchingNodes = staircaseNodes.filter(other =>
        other._id.toString() !== node._id.toString() &&
        !usedNodes.has(other._id.toString()) &&
        other.floorId.toString() !== node.floorId.toString() &&
        distance(node, other) <= toleranceVal
      );

      // Include the current node
      const group = [node, ...matchingNodes];
      
      // Mark all as used
      group.forEach(n => usedNodes.add(n._id.toString()));

      // Only create staircase if we have at least 2 nodes (across different floors)
      if (group.length < 2) {
        // Single staircase node with no match – still create a staircase? 
        // Possibly we want to leave it unlinked for now, but we can create a staircase with just one node.
        // Let's create a staircase with this node alone (admin can later merge)
        // But we need a name. We'll use "Staircase-" + node._id
        const uniqueName = `Staircase-${node._id.toString().slice(-6)}`;
        const nodeMap = new Map();
        nodeMap.set(node.floorId.toString(), node._id);
        const staircase = await Staircase.create({
          buildingId,
          name: uniqueName,
          nodeIdsPerFloor: nodeMap,
          tolerance: toleranceVal,
        });
        // Update node with staircaseId
        node.staircaseId = staircase._id;
        await node.save();
        createdStaircases.push(staircase);
        continue;
      }

      // Generate a name: use floor numbers or simple "Staircase" + index
      // Check existing staircases to avoid duplicates
      const existingNames = await Staircase.find({ buildingId }).distinct('name');
      let baseName = 'Staircase';
      let counter = 1;
      let proposedName = `${baseName}-${counter}`;
      while (existingNames.includes(proposedName)) {
        counter++;
        proposedName = `${baseName}-${counter}`;
      }

      // Build the nodeIdsPerFloor map
      const nodeMap = new Map();
      for (const n of group) {
        nodeMap.set(n.floorId.toString(), n._id);
      }

      const staircase = await Staircase.create({
        buildingId,
        name: proposedName,
        nodeIdsPerFloor: nodeMap,
        tolerance: toleranceVal,
      });

      // Update each node with the staircaseId
      for (const n of group) {
        n.staircaseId = staircase._id;
        await n.save();
      }

      createdStaircases.push(staircase);
    }

    res.status(200).json({
      success: true,
      message: `Auto-linked staircases: ${createdStaircases.length} created/updated`,
      linked: createdStaircases.length,
      data: createdStaircases,
    });
  } catch (error) {
    console.error('AutoLinkStaircases error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Manually create/update a staircase (admin override)
// @route   POST /api/staircases
// @access  Private (admin only)
const createStaircase = async (req, res) => {
  try {
    const { buildingId, name, nodeIdsPerFloor, tolerance, description } = req.body;

    if (!buildingId || !name || !nodeIdsPerFloor) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check for duplicate name within building
    const existing = await Staircase.findOne({ buildingId, name });
    if (existing) {
      return res.status(400).json({ message: 'Staircase with this name already exists in this building' });
    }

    // Validate that nodes exist and belong to the building
    const nodeIds = Array.from(nodeIdsPerFloor.values());
    const nodes = await Node.find({ _id: { $in: nodeIds } });
    if (nodes.length !== nodeIds.length) {
      return res.status(400).json({ message: 'One or more nodes not found' });
    }

    // Ensure nodes belong to floors of this building
    const floorIds = nodes.map(n => n.floorId);
    const floors = await Floor.find({ _id: { $in: floorIds }, buildingId });
    if (floors.length !== floorIds.length) {
      return res.status(400).json({ message: 'Some nodes do not belong to this building' });
    }

    const staircase = await Staircase.create({
      buildingId,
      name,
      nodeIdsPerFloor: new Map(Object.entries(nodeIdsPerFloor)),
      tolerance: tolerance || DEFAULT_STAIRCASE_TOLERANCE,
      description,
    });

    // Update each node with staircaseId
    for (const [floorIdStr, nodeId] of Object.entries(nodeIdsPerFloor)) {
      await Node.findByIdAndUpdate(nodeId, { staircaseId: staircase._id });
    }

    res.status(201).json({
      success: true,
      data: staircase,
    });
  } catch (error) {
    console.error('CreateStaircase error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a staircase (e.g., rename, tolerance)
// @route   PUT /api/staircases/:id
// @access  Private (admin only)
const updateStaircase = async (req, res) => {
  try {
    const { name, tolerance, description, nodeIdsPerFloor } = req.body;
    const staircase = await Staircase.findById(req.params.id);
    if (!staircase) {
      return res.status(404).json({ message: 'Staircase not found' });
    }

    if (name) {
      // Check duplicate
      const existing = await Staircase.findOne({ buildingId: staircase.buildingId, name });
      if (existing && existing._id.toString() !== staircase._id.toString()) {
        return res.status(400).json({ message: 'Name already used in this building' });
      }
      staircase.name = name;
    }
    if (tolerance !== undefined) staircase.tolerance = tolerance;
    if (description !== undefined) staircase.description = description;

    // If updating nodeIdsPerFloor, need to update node references
    if (nodeIdsPerFloor) {
      // Clear old references from nodes
      const oldNodeIds = Array.from(staircase.nodeIdsPerFloor.values());
      await Node.updateMany(
        { _id: { $in: oldNodeIds } },
        { $unset: { staircaseId: 1 } }
      );

      // Set new references
      const newNodeIds = Array.from(Object.values(nodeIdsPerFloor));
      await Node.updateMany(
        { _id: { $in: newNodeIds } },
        { staircaseId: staircase._id }
      );

      staircase.nodeIdsPerFloor = new Map(Object.entries(nodeIdsPerFloor));
    }

    await staircase.save();

    res.status(200).json({
      success: true,
      data: staircase,
    });
  } catch (error) {
    console.error('UpdateStaircase error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a staircase
// @route   DELETE /api/staircases/:id
// @access  Private (admin only)
const deleteStaircase = async (req, res) => {
  try {
    const staircase = await Staircase.findById(req.params.id);
    if (!staircase) {
      return res.status(404).json({ message: 'Staircase not found' });
    }

    // Remove staircaseId from all linked nodes
    const nodeIds = Array.from(staircase.nodeIdsPerFloor.values());
    await Node.updateMany(
      { _id: { $in: nodeIds } },
      { $unset: { staircaseId: 1 } }
    );

    await staircase.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Staircase deleted successfully',
    });
  } catch (error) {
    console.error('DeleteStaircase error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getStaircasesByBuilding,
  autoLinkStaircases,
  createStaircase,
  updateStaircase,
  deleteStaircase,
};