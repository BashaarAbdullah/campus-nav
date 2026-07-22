// backend/src/routes/buildings.js
// Building routes – CRUD operations and master SVG linking

const express = require('express');
const router = express.Router();
const {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  linkBuildingToMaster,
} = require('../controllers/buildingController');
const { protect } = require('../middleware/auth');

// Public routes (view buildings)
router.get('/', getBuildings);
router.get('/:id', getBuildingById);

// Admin-only routes
router.post('/', protect, createBuilding);
router.put('/:id', protect, updateBuilding);
router.delete('/:id', protect, deleteBuilding);
router.post('/:id/link-master', protect, linkBuildingToMaster);

module.exports = router;