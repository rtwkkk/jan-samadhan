const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        req.user = await Admin.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        const Institution = require('../models/Institution');
        req.user = await Institution.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        const Industry = require('../models/Industry');
        req.user = await Industry.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        req.user = await Admin.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        const Institution = require('../models/Institution');
        req.user = await Institution.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        const Industry = require('../models/Industry');
        req.user = await Industry.findById(decoded.id).select('-password');
      }
    } catch (error) {
      console.error('Optional auth token failed:', error.message);
    }
  }
  next();
};

module.exports = { protect, optionalAuth };
