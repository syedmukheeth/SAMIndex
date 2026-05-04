const User = require('../models/user.model');
const Repository = require('../models/repository.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cache = require('../utils/cache');

/**
 * @desc    Search for users and repositories with caching and query optimization
 * @route   GET /api/v1/search
 * @access  Public
 */
exports.searchAll = catchAsync(async (req, res, next) => {
  const { q, page = 1, limit = 10, sort = 'score' } = req.query;
  const cacheKey = `search:${q}:${page}:${limit}:${sort}`;

  // 1. Check Cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      ...cachedData,
    });
  }

  const skip = (page - 1) * limit;

  if (!q) {
    return res.status(200).json({
      status: 'success',
      data: { users: [], repositories: [] },
    });
  }

  // 2. Optimized Mongo Queries
  const searchQuery = { $text: { $search: q } };
  const textScoreProjection = { searchScore: { $meta: 'textScore' } };
  
  // Fields to exclude to reduce response size
  const excludeFields = '-__v -updatedAt -createdAt';

  // 3. Perform parallel searches with .lean() for speed
  const [users, repositories] = await Promise.all([
    User.find(searchQuery, textScoreProjection)
      .select(excludeFields)
      .sort(sort === 'score' ? { score: -1 } : textScoreProjection)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Repository.find(searchQuery, textScoreProjection)
      .select(excludeFields)
      .sort(sort === 'score' ? { stars: -1 } : textScoreProjection)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
  ]);

  const responseData = {
    results: {
      usersCount: users.length,
      reposCount: repositories.length,
    },
    data: {
      users,
      repositories,
    },
  };

  // 4. Set Cache
  cache.set(cacheKey, responseData);

  res.status(200).json({
    status: 'success',
    source: 'database',
    ...responseData,
  });
});

/**
 * @desc    Get single user details with caching and lean queries
 * @route   GET /api/v1/user/:username
 * @access  Public
 */
exports.getUserDetails = catchAsync(async (req, res, next) => {
  const { username } = req.params;
  const cacheKey = `user:${username}`;

  // Check Cache
  const cachedUser = cache.get(cacheKey);
  if (cachedUser) {
    return res.status(200).json({
      status: 'success',
      source: 'cache',
      data: cachedUser,
    });
  }

  const user = await User.findOne({ username }).select('-__v').lean();
  if (!user) {
    return next(new AppError('User not found in SamIndex. Please sync first.', 404));
  }

  const repositories = await Repository.find({ owner: username })
    .select('-__v -updatedAt')
    .sort({ stars: -1 })
    .lean();

  const responseData = {
    user,
    repositories,
  };

  // Set Cache (Longer TTL for profile pages)
  cache.set(cacheKey, responseData, 600); // 10 minutes

  res.status(200).json({
    status: 'success',
    source: 'database',
    data: responseData,
  });
});
