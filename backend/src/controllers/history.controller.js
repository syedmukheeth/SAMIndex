const SearchHistory = require('../models/SearchHistory');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get user's search history
 * @route   GET /api/v1/history
 */
exports.getUserHistory = catchAsync(async (req, res) => {
  const { limit = 20, repo } = req.query;
  
  const query = { userId: req.user.id };
  if (repo) query.repo = repo;

  const history = await SearchHistory.find(query)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .lean();

  res.status(200).json({
    status: 'success',
    count: history.length,
    data: history
  });
});

/**
 * @desc    Clear user's search history
 * @route   DELETE /api/v1/history
 */
exports.clearHistory = catchAsync(async (req, res) => {
  await SearchHistory.deleteMany({ userId: req.user.id });

  res.status(204).json({
    status: 'success',
    data: null
  });
});
