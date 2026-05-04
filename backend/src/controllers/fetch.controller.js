const githubService = require('../services/github.service');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Fetch and sync GitHub user and repositories
 * @route   POST /api/v1/fetch/:username
 * @access  Public
 */
exports.fetchUserAndRepos = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  const result = await githubService.syncUserData(username);

  res.status(200).json({
    status: 'success',
    data: {
      user: result.user,
      reposCount: result.reposCount,
    },
  });
});
