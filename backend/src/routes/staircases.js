// backend/src/routes/staircases.js
// Staircase routes – auto-linking, CRUD, and management of multi-floor staircases

const express = require('express');
const router = express.Router();
const {
  getStaircasesByBuilding,
  autoLinkStaircases,
  createStaircase,
  updateStaircase,
  deleteStaircase,
} = require('../controllers/staircaseController');
const { protect } = require('../middleware/auth');

// Public routes (view staircases)
router.get('/building/:buildingId', getStaircasesByBuilding);

// Admin-only routes
router.post('/building/:buildingId/auto-link', protect, autoLinkStaircases);
router.post('/', protect, createStaircase);
router.put('/:id', protect, updateStaircase);
router.delete('/:id', protect, deleteStaircase);

module.exports = router;