// backend/src/app.js
// Express application initialization – middleware, routes, and error handling
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const corsOptions = require('./config/cors');
const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const floorRoutes = require('./routes/floors');
const nodeRoutes = require('./routes/nodes');
const edgeRoutes = require('./routes/edges');
const staircaseRoutes = require('./routes/staircases');
const pathRoutes = require('./routes/paths');

// Initialize app
const app = express();

// Connect to database (if not already connected)
connectDB();

// Security middleware
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Passport initialization
app.use(passport.initialize());
require('./config/passport'); // Load JWT strategy

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/staircases', staircaseRoutes);
app.use('/api/paths', pathRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;