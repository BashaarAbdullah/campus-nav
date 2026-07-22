// backend/src/routes/edges.js
// Edge routes – CRUD operations for walkable connections between nodes

const express = require('express');
const router = express.Router();
const {
  getEdgesByFloor,
  createEdge,
  updateEdge,
  deleteEdge,
  deleteEdgesByFloor,
} = require('../controllers/edgeController');
const { protect } = require('../middleware/auth');

// Public routes (view edges)
router.get('/floor/:floorId', getEdgesByFloor);

// Admin-only routes
router.post('/', protect, createEdge);
router.put('/:id', protect, updateEdge);
router.delete('/:id', protect, deleteEdge);
router.delete('/floor/:floorId', protect, deleteEdgesByFloor);

module.exports = router;