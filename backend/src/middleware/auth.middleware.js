const AppError = require('../utils/appError');

/**
 * Simple API Key Authentication Middleware
 */
exports.protect = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return next(new AppError('Unauthorized: Invalid or missing API Key', 401));
  }

  next();
};
