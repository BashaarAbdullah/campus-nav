// backend/src/controllers/buildingController.js
// Handles CRUD operations for buildings and master SVG linking

const Building = require('../models/Building');
const Floor = require('../models/Floor');
const MasterSvg = require('../models/MasterSvg');

// @desc    Get all buildings
// @route   GET /api/buildings
// @access  Public (for end-users) / Private (admin)
const getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find().populate('floors');
    res.status(200).json({
      success: true,
      count: buildings.length,
      data: buildings,
    });
  } catch (error) {
    console.error('GetBuildings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single building by ID
// @route   GET /api/buildings/:id
// @access  Public
const getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id)
      .populate({
        path: 'floors',
        populate: {
          path: 'nodeIds',
          model: 'Node',
        },
      })
      .populate('masterSvgId');

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error('GetBuildingById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new building
// @route   POST /api/buildings
// @access  Private (admin only)
const createBuilding = async (req, res) => {
  try {
    const { name, code } = req.body;

    // Check for existing building with same name or code
    const existing = await Building.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: 'Building name or code already exists' });
    }

    const building = await Building.create({ name, code });
    res.status(201).json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error('CreateBuilding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update building details
// @route   PUT /api/buildings/:id
// @access  Private (admin only)
const updateBuilding = async (req, res) => {
  try {
    const { name, code, masterRegionId, regionData } = req.body;
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Update fields
    if (name) building.name = name;
    if (code) building.code = code;
    if (masterRegionId !== undefined) building.masterRegionId = masterRegionId;
    if (regionData) building.regionData = regionData;

    await building.save();

    res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error('UpdateBuilding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a building and all associated floors/nodes/edges
// @route   DELETE /api/buildings/:id
// @access  Private (admin only)
const deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Delete all floors (which cascade to nodes/edges via middleware or manual)
    // We'll handle cascading in floor deletion logic, but here we can remove floors explicitly
    await Floor.deleteMany({ buildingId: building._id });

    // Remove building reference from master SVG if linked
    if (building.masterSvgId) {
      await MasterSvg.updateOne(
        { _id: building.masterSvgId },
        { $pull: { regions: { buildingId: building._id } } }
      );
    }

    await building.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Building deleted successfully',
    });
  } catch (error) {
    console.error('DeleteBuilding error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Link a building to a region on the master SVG
// @route   POST /api/buildings/:id/link-master
// @access  Private (admin only)
const linkBuildingToMaster = async (req, res) => {
  try {
    const { masterSvgId, regionId, boundingBox, metadata } = req.body;

    const building = await Building.findById(req.params.id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    const masterSvg = await MasterSvg.findById(masterSvgId);
    if (!masterSvg) {
      return res.status(404).json({ message: 'Master SVG not found' });
    }

    // Check if region already linked to another building
    const existingRegion = masterSvg.regions.find(
      (r) => r.regionId === regionId && r.buildingId && r.buildingId.toString() !== building._id.toString()
    );
    if (existingRegion) {
      return res.status(400).json({ message: 'Region already linked to another building' });
    }

    // Update or add region
    const regionIndex = masterSvg.regions.findIndex((r) => r.regionId === regionId);
    const regionData = {
      regionId,
      buildingId: building._id,
      boundingBox,
      metadata,
    };

    if (regionIndex === -1) {
      masterSvg.regions.push(regionData);
    } else {
      masterSvg.regions[regionIndex] = { ...masterSvg.regions[regionIndex], ...regionData };
    }

    await masterSvg.save();

    // Update building with reference
    building.masterSvgId = masterSvgId;
    building.masterRegionId = regionId;
    await building.save();

    res.status(200).json({
      success: true,
      data: {
        building,
        masterSvg,
      },
    });
  } catch (error) {
    console.error('LinkBuildingToMaster error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  linkBuildingToMaster,
};