// backend/src/routes/floors.js
// Floor routes – upload, retrieve, update, and delete floors

const express = require('express');
const router = express.Router();
const {
  getFloorsByBuilding,
  getFloorByBuildingAndNumber,
  uploadFloor,
  deleteFloor,
  updateFloor,
} = require('../controllers/floorController');
const { protect } = require('../middleware/auth');

// Public routes (view floors)
router.get('/building/:buildingId', getFloorsByBuilding);
router.get('/:buildingId/:floorNumber', getFloorByBuildingAndNumber);

// Admin-only routes
router.post('/upload', protect, uploadFloor);
router.put('/:id', protect, updateFloor);
router.delete('/:id', protect, deleteFloor);

module.exports = router;