// backend/src/routes/auth.js
// Authentication routes – login, logout, and current user profile

const express = require('express');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Protected routes (admin only)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;