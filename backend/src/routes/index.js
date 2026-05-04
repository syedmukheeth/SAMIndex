const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SamIndex API is healthy',
  });
});

// Import sub-routes here
const fetchController = require('../controllers/fetch.controller');
const searchController = require('../controllers/search.controller');
const codeController = require('../controllers/code.controller');
const authRoutes = require('./auth.routes');
const historyRoutes = require('./history.routes');
const authMiddleware = require('../middleware/auth.middleware');

// Auth routes
router.use('/auth', authRoutes);
router.use('/history', historyRoutes);

// Index Repository route
router.post('/index-repo', authMiddleware.protectOrApiKey, codeController.indexRepository);
router.get('/index-status/:jobId', codeController.getIndexStatus);

// Code Search route
router.get('/code-search', codeController.searchCode);

// Fetch route
router.post('/fetch/:username', fetchController.fetchUserAndRepos);

// Search route
router.get('/search', searchController.searchAll);

// User details route
router.get('/user/:username', searchController.getUserDetails);

module.exports = router;
