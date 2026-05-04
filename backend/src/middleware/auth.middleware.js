const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - ensures user is logged in
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1) Getting token and check if it's there
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev');

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }
};

/**
 * Protect or API Key - allows either a valid JWT or a valid internal API Key
 * Useful for allowing guest indexing in local dev
 */
exports.protectOrApiKey = async (req, res, next) => {
  // 1) Check for API Key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === (process.env.API_KEY || 'samindex_secret_key_2026')) {
    return next();
  }

  // 2) Fallback to standard protection
  return exports.protect(req, res, next);
};

/**
 * Restrict to specific roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
