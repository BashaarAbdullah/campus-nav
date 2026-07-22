// backend/src/routes/paths.js
// Pathfinding routes – compute shortest path between nodes or rooms

const express = require('express');
const router = express.Router();
const {
  findShortestPath,
  findPathByRoomNames,
} = require('../controllers/pathController');

// Public routes (end-users can find paths)
router.post('/shortest', findShortestPath);
router.post('/rooms', findPathByRoomNames);

module.exports = router;