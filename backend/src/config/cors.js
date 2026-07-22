// backend/src/config/cors.js
// CORS configuration – allows frontend origin and credentials for session cookies

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies/auth headers to be sent
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;