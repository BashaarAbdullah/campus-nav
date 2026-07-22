// backend/src/controllers/pathController.js
// Handles pathfinding requests – computes shortest route between two nodes

const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Staircase = require('../models/Staircase');
const Floor = require('../models/Floor');
const pathfinder = require('../services/pathfinder');

// @desc    Find shortest path between two nodes
// @route   POST /api/paths/shortest
// @access  Public (end-users) and Private (admin can test)
const findShortestPath = async (req, res) => {
  try {
    const { sourceNodeId, targetNodeId, includeDirections } = req.body;

    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({ message: 'Missing source or target node ID' });
    }

    // Fetch nodes
    const sourceNode = await Node.findById(sourceNodeId).populate('floorId');
    const targetNode = await Node.findById(targetNodeId).populate('floorId');
    if (!sourceNode || !targetNode) {
      return res.status(404).json({ message: 'Source or target node not found' });
    }

    // Check if nodes are in same building (we don't support inter-building yet)
    // We need to check building via floor -> building
    const sourceFloor = await Floor.findById(sourceNode.floorId).populate('buildingId');
    const targetFloor = await Floor.findById(targetNode.floorId).populate('buildingId');
    if (!sourceFloor || !targetFloor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // For now, require same building (since inter-building not supported)
    if (sourceFloor.buildingId._id.toString() !== targetFloor.buildingId._id.toString()) {
      return res.status(400).json({
        message: 'Pathfinding between different buildings is not yet supported',
        suggestion: 'Select nodes within the same building',
      });
    }

    // Fetch all nodes and edges for the building
    const buildingId = sourceFloor.buildingId._id;
    const floors = await Floor.find({ buildingId });
    const floorIds = floors.map(f => f._id);

    const nodes = await Node.find({ floorId: { $in: floorIds } });
    const edges = await Edge.find({ floorId: { $in: floorIds } });

    // Fetch staircases for vertical connections
    const staircases = await Staircase.find({ buildingId });

    // Build graph and run pathfinding
    const result = await pathfinder.findShortestPath({
      sourceNode,
      targetNode,
      allNodes: nodes,
      allEdges: edges,
      staircases,
      floors,
      includeDirections: includeDirections !== false,
    });

    if (!result || !result.path || result.path.length === 0) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'No path found between the given nodes',
      });
    }

    // Format response
    const response = {
      success: true,
      found: true,
      path: result.path.map(node => ({
        id: node._id,
        label: node.label,
        type: node.type,
        floor: node.floorNumber || node.floorId?.floorNumber,
        x: node.x,
        y: node.y,
      })),
      totalWeight: result.totalWeight,
      steps: result.steps || [],
      // Include metadata about floor transitions
      floorTransitions: result.floorTransitions || [],
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('FindShortestPath error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get path between two room names (convenience endpoint)
// @route   POST /api/paths/rooms
// @access  Public
const findPathByRoomNames = async (req, res) => {
  try {
    const { sourceRoomName, targetRoomName, buildingCode } = req.body;

    if (!sourceRoomName || !targetRoomName || !buildingCode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find building by code
    const Building = require('../models/Building');
    const building = await Building.findOne({ code: buildingCode.toUpperCase() });
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Find nodes matching room names in this building
    // We'll need to get all floors for building
    const floors = await Floor.find({ buildingId: building._id });
    const floorIds = floors.map(f => f._id);

    const sourceNodes = await Node.find({
      floorId: { $in: floorIds },
      type: 'room',
      label: { $regex: new RegExp(`^${sourceRoomName}$`, 'i') },
    });
    const targetNodes = await Node.find({
      floorId: { $in: floorIds },
      type: 'room',
      label: { $regex: new RegExp(`^${targetRoomName}$`, 'i') },
    });

    if (sourceNodes.length === 0) {
      return res.status(404).json({ message: `Source room "${sourceRoomName}" not found` });
    }
    if (targetNodes.length === 0) {
      return res.status(404).json({ message: `Target room "${targetRoomName}" not found` });
    }

    // For simplicity, take first match
    // Could also disambiguate with floor number if multiple
    const sourceNode = sourceNodes[0];
    const targetNode = targetNodes[0];

    // Call the main pathfinder
    req.body.sourceNodeId = sourceNode._id;
    req.body.targetNodeId = targetNode._id;
    return findShortestPath(req, res);
  } catch (error) {
    console.error('FindPathByRoomNames error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  findShortestPath,
  findPathByRoomNames,
};