// backend/src/controllers/floorController.js
// Handles floor operations: upload SVG, retrieve floors, and manage floor data

const Floor = require('../models/Floor');
const Building = require('../models/Building');
const Node = require('../models/Node');
const Edge = require('../models/Edge');

// @desc    Get all floors for a building
// @route   GET /api/floors/building/:buildingId
// @access  Public
const getFloorsByBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const floors = await Floor.find({ buildingId }).sort({ floorNumber: 1 });
    res.status(200).json({
      success: true,
      count: floors.length,
      data: floors,
    });
  } catch (error) {
    console.error('GetFloorsByBuilding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a specific floor by building + floor number
// @route   GET /api/floors/:buildingId/:floorNumber
// @access  Public
const getFloorByBuildingAndNumber = async (req, res) => {
  try {
    const { buildingId, floorNumber } = req.params;
    const floor = await Floor.findOne({ buildingId, floorNumber })
      .populate({
        path: 'nodeIds',
        populate: {
          path: 'staircaseId',
          model: 'Staircase',
        },
      });

    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // Also get edges for this floor
    const edges = await Edge.find({ floorId: floor._id })
      .populate('sourceNodeId targetNodeId');

    res.status(200).json({
      success: true,
      data: {
        floor,
        edges,
      },
    });
  } catch (error) {
    console.error('GetFloorByBuildingAndNumber error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload a new floor SVG
// @route   POST /api/floors/upload
// @access  Private (admin only)
const uploadFloor = async (req, res) => {
  try {
    const { buildingId, floorNumber, svgData, metadata } = req.body;

    if (!buildingId || !floorNumber || !svgData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if building exists
    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Check if floor already exists
    const existingFloor = await Floor.findOne({ buildingId, floorNumber });
    if (existingFloor) {
      // Update existing floor
      existingFloor.svgData = svgData;
      if (metadata) existingFloor.metadata = metadata;
      await existingFloor.save();

      // Ensure building's floors array includes this floor
      if (!building.floors.includes(existingFloor._id)) {
        building.floors.push(existingFloor._id);
        await building.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Floor updated successfully',
        data: existingFloor,
      });
    }

    // Create new floor
    const floor = await Floor.create({
      buildingId,
      floorNumber,
      svgData,
      metadata: metadata || {},
      nodeIds: [],
    });

    // Add to building's floors array
    building.floors.push(floor._id);
    await building.save();

    res.status(201).json({
      success: true,
      data: floor,
    });
  } catch (error) {
    console.error('UploadFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a floor and all its nodes/edges
// @route   DELETE /api/floors/:id
// @access  Private (admin only)
const deleteFloor = async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.id);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // Delete all nodes on this floor
    await Node.deleteMany({ floorId: floor._id });

    // Delete all edges on this floor
    await Edge.deleteMany({ floorId: floor._id });

    // Remove floor reference from building
    await Building.updateOne(
      { _id: floor.buildingId },
      { $pull: { floors: floor._id } }
    );

    await floor.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Floor deleted successfully',
    });
  } catch (error) {
    console.error('DeleteFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update floor metadata (e.g., SVG data, metadata)
// @route   PUT /api/floors/:id
// @access  Private (admin only)
const updateFloor = async (req, res) => {
  try {
    const { svgData, metadata } = req.body;
    const floor = await Floor.findById(req.params.id);

    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    if (svgData) floor.svgData = svgData;
    if (metadata) floor.metadata = { ...floor.metadata, ...metadata };

    await floor.save();

    res.status(200).json({
      success: true,
      data: floor,
    });
  } catch (error) {
    console.error('UpdateFloor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getFloorsByBuilding,
  getFloorByBuildingAndNumber,
  uploadFloor,
  deleteFloor,
  updateFloor,
};