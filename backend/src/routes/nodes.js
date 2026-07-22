// backend/src/routes/nodes.js
// Node routes – CRUD operations for nodes placed on floors

const express = require('express');
const router = express.Router();
const {
  getNodesByFloor,
  createNode,
  updateNode,
  deleteNode,
  getNodeById,
} = require('../controllers/nodeController');
const { protect } = require('../middleware/auth');

// Public routes (view nodes)
router.get('/floor/:floorId', getNodesByFloor);
router.get('/:id', getNodeById);

// Admin-only routes
router.post('/', protect, createNode);
router.put('/:id', protect, updateNode);
router.delete('/:id', protect, deleteNode);

module.exports = router;