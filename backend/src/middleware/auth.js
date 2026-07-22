// backend/src/middleware/auth.js
// Authentication middleware – verifies JWT token and attaches user to request

const passport = require('passport');

// Middleware to protect routes (admin only)
const protect = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized – please log in as admin' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Optional: check if user is admin (same as protect but with additional role check)
const adminOnly = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden – admin access required' });
    }
    next();
  });
};

module.exports = {
  protect,
  adminOnly,
};