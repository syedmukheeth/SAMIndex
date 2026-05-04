const express = require('express');
const historyController = require('../controllers/history.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.route('/')
  .get(historyController.getUserHistory)
  .delete(historyController.clearHistory);

module.exports = router;
