// backend/src/config/passport.js
// JWT authentication strategy for admin login – extracts token from Authorization header

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const Admin = require('../models/Admin');

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const admin = await Admin.findById(jwt_payload.id);
      if (admin) {
        return done(null, admin);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport;