const User = require('../models/User');
const Repository = require('../models/repository.model');
const UserRepo = require('../models/userRepo.model');
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

  // 2. Build MongoDB Query
  let searchQuery = {};
  if (q) {
    searchQuery = { $text: { $search: q } };
  }
  
  const textScoreProjection = q ? { searchScore: { $meta: 'textScore' } } : {};
  
  // Fields to exclude to reduce response size
  const excludeFields = '-__v -updatedAt -createdAt';

  // RECENT WORKSPACES PRIVACY: Developers see all, users see their own, guests see nothing
  let repositories = [];
  if (req.isDeveloper && !req.user) {
    // True developer/system mode: show all
    repositories = await Repository.find(searchQuery, textScoreProjection)
      .select(excludeFields)
      .sort(q ? (sort === 'score' ? { stars: -1 } : textScoreProjection) : { lastIndexedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
  } else if (req.user) {
    // Personalized Mode: Only show what THIS user has indexed or accessed
    const userRepoLinks = await UserRepo.find({ userId: req.user._id })
      .select('repositoryId')
      .lean();
    
    const repoIds = userRepoLinks.map(link => link.repositoryId);
    
    if (repoIds.length > 0) {
      repositories = await Repository.find({ ...searchQuery, _id: { $in: repoIds } }, textScoreProjection)
        .select(excludeFields)
        .sort(q ? (sort === 'score' ? { stars: -1 } : textScoreProjection) : { lastIndexedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
    }
  }

  const users = q 
    ? await User.find(searchQuery, textScoreProjection)
        .select(excludeFields)
        .sort(sort === 'score' ? { score: -1 } : textScoreProjection)
        .skip(skip)
        .limit(Number(limit))
        .lean()
    : [];

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

/**
 * @desc    Claim repositories that don't have an owner (Migration Tool)
 * @route   POST /api/v1/claim-orphans
 * @access  Private
 */
exports.claimOrphanRepos = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('No authenticated user found to claim workspaces. Please log in or use Developer Mode.', 401));
  }

  // Find all repos where user field is missing or null
  const result = await Repository.updateMany(
    { $or: [ { user: { $exists: false } }, { user: null } ] },
    { $set: { user: req.user._id } }
  );

  // Clear search cache to reflect changes immediately
  cache.flushAll();

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} neural workspaces restored to account: ${req.user.name}`,
    data: {
      modifiedCount: result.modifiedCount,
      user: req.user.name
    }
  });
});
