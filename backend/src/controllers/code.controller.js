const indexQueue = require('../queues/index.queue');
const githubService = require('../services/github.service');
const cache = require('../utils/cache');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const CodeFile = require('../models/codeFile.model');
const SearchHistory = require('../models/SearchHistory');
const { isRedisConnected } = require('../config/redis');
const indexingService = require('../services/indexing.service');
const Repository = require('../models/repository.model');
const UserRepo = require('../models/userRepo.model');

/**
 * @desc    Add repository indexing task to queue
 * @route   POST /api/v1/index-repo
 * @access  Private (API Key Required)
 */
exports.indexRepository = catchAsync(async (req, res, next) => {
  let { owner, repo, force = false } = req.body;

  // SENIOR DEV AUTO-PARSER: Handle full paths (owner/repo) or full URLs
  if (repo && !owner && repo.includes('/')) {
    const cleanPath = repo.trim().replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1];
    }
  }

  if (!owner || !repo) {
    return next(new AppError('Please provide owner and repo name (or a full GitHub URL)', 400));
  }

  const cacheKey = `indexed:${owner.toLowerCase()}:${repo.toLowerCase()}`;
  
  // 2. Pre-flight Check: Check DB status
  // Case-insensitive lookup for repository
  let existingRepo = await Repository.findOne({ 
    owner: { $regex: new RegExp(`^${owner}$`, 'i') }, 
    name: { $regex: new RegExp(`^${repo}$`, 'i') } 
  });

  if (!force && existingRepo?.isIndexed) {
    cache.set(cacheKey, 'completed', 3600);
    return res.status(200).json({
      status: 'success',
      message: `Neural Link Established for ${owner}/${repo}`,
      data: { cached: true, isIndexed: true }
    });
  }

  // NEW: Ensure Repository record exists with metadata before indexing
  if (!existingRepo) {
    try {
      const meta = await githubService.getRepoDetails(owner, repo);
      await Repository.create({
        name: repo.toLowerCase(),
        owner: owner.toLowerCase(),
        stars: meta.stargazers_count,
        forks: meta.forks_count,
        lang: meta.language,
        url: meta.html_url,
        description: meta.description,
        githubId: meta.id,
        isIndexed: false,
        user: req.user?._id // ASSOCIATE WITH USER
      });
    } catch (e) {
      console.warn('Metadata fetch failed, creating stub:', e.message);
      await Repository.create({
        name: repo.toLowerCase(),
        owner: owner.toLowerCase(),
        url: `https://github.com/${owner}/${repo}`,
        isIndexed: false,
        user: req.user?._id // ASSOCIATE WITH USER
      });
    }
  }

  // SENIOR DEV PERSONALIZATION: Record relationship in UserRepo
  if (req.user) {
    const repoRecord = existingRepo || await Repository.findOne({ owner: owner.toLowerCase(), name: repo.toLowerCase() });
    if (repoRecord) {
      await UserRepo.findOneAndUpdate(
        { userId: req.user._id, repositoryId: repoRecord._id },
        { lastAccessedAt: new Date() },
        { upsert: true, new: true }
      ).catch(err => console.error('[UserRepo Association Failed]:', err.message));
    }
  }

  // 3. Proactive Rate Limit Check
  const rateLimit = await githubService.getRateLimit();
  if (rateLimit && rateLimit.remaining < 100) {
    return next(new AppError(`GitHub API points nearly exhausted (${rateLimit.remaining} left). Indexing might fail. Please wait until ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}.`, 429));
  }

  // 4. Queue vs Fallback (Lightweight)
  const jobId = isRedisConnected() ? `job-${Date.now()}` : `local-${Date.now()}`;
  
  if (isRedisConnected()) {
    const job = await indexQueue.add(`index-${owner}-${repo}`, { owner, repo }, { jobId });
    cache.set(cacheKey, 'pending', 300);
  } else {
    // Start indexing in background without awaiting discovery
    indexingService.processIndexing({ owner, repo, jobId }).catch(err => {
      console.error('[Local Fallback Error]:', err);
    });
    cache.set(cacheKey, 'pending', 300);
  }

  res.status(202).json({
    status: 'success',
    message: 'Indexing sequence initiated in the neural background.',
    data: { jobId, owner, repo }
  });
});

/**
 * @desc    Check status of an indexing job
 * @route   GET /api/v1/index-status/:jobId
 */
exports.getIndexStatus = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;

  const cachedStatus = cache.get(`job:${jobId}`);
  if (cachedStatus) {
    return res.status(200).json({
      status: 'success',
      data: {
        id: jobId,
        ...cachedStatus,
        isFallback: jobId.startsWith('local:')
      }
    });
  }

  // Handle Local Fallback Jobs or Quick Status (Backwards Compatibility / Fallback)
  if (jobId.startsWith('local:') || !isRedisConnected()) {
    const parts = jobId.split(':');
    const owner = parts[1];
    const repo = parts[2];

    const count = await CodeFile.countDocuments({ owner, repo });
    const totalFiles = cachedStatus?.result?.filesFound || 100; // Default estimate or actual if known
    const progress = Math.min(Math.floor((count / totalFiles) * 100), 99);
    
    return res.status(200).json({
      status: 'success',
      data: {
        id: jobId,
        state: count > 0 ? 'active' : 'waiting',
        progress, 
        result: { filesIndexed: count, filesFound: totalFiles },
        isFallback: true
      }
    });
  }

  const job = await indexQueue.getJob(jobId);
  if (!job) {
    // If job is missing from Redis, check if files actually exist in DB
    const [_, owner, repo] = jobId.split(':');
    const count = await CodeFile.countDocuments({ owner, repo });
    if (count > 0) {
      return res.status(200).json({
        status: 'success',
        data: { id: jobId, state: 'completed', progress: 100, result: { filesIndexed: count } }
      });
    }
    return next(new AppError('Job tracking expired. Check results in 1 minute.', 404));
  }

  const state = await job.getState();
  const progress = job.progress;
  const result = job.returnvalue;

  res.status(200).json({
    status: 'success',
    data: {
      id: job.id,
      state: state === 'completed' ? 'completed' : state,
      progress: state === 'completed' ? 100 : progress,
      result,
      failedReason: job.failedReason
    }
  });
});

exports.searchCode = catchAsync(async (req, res, next) => {
  const { q, repo, page = 1, limit = 20 } = req.query;

  if (!q) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // 1. Build Query - Use Regex for partial matches (essential for code like 'imp' -> 'import')
  const searchQuery = {
    $or: [
      { content: { $regex: q, $options: 'i' } },
      { path: { $regex: q, $options: 'i' } }
    ]
  };

  // If searching in a specific repo (Workspace Mode)
  if (repo) {
    searchQuery.repo = repo.toLowerCase();
    if (req.query.owner) {
      searchQuery.owner = req.query.owner.toLowerCase();
    }
  }

  console.log(`[CodeSearch] Query for ${req.query.owner}/${repo}:`, JSON.stringify(searchQuery));

  // 2. Run Search and Count in Parallel
  const [results, totalResults] = await Promise.all([
    CodeFile.find(searchQuery)
      .skip(skip)
      .limit(limitNum)
      .select('repo path owner content')
      .lean(),
    CodeFile.countDocuments(searchQuery)
  ]);

  // 2. Format Response with Multiple Code Snippets
  const formattedResults = results.map(file => {
    const lines = file.content.split('\n');
    const keyword = q.toLowerCase();
    
    // Find ALL lines containing the keyword
    const allMatches = [];
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(keyword)) {
        allMatches.push(index);
      }
    });

    // Extract top 3 snippets
    const snippets = allMatches.slice(0, 3).map(matchIndex => {
      const start = Math.max(0, matchIndex - 2);
      const end = Math.min(lines.length, matchIndex + 3);
      
      let snippetContent = lines.slice(start, end).join('\n');
      
      // Add visual indicators
      if (start > 0) snippetContent = '...\n' + snippetContent;
      if (end < lines.length) snippetContent = snippetContent + '\n...';

      return {
        line: matchIndex + 1,
        content: snippetContent.trim()
      };
    });

    // Fallback if no line match (rare with $text search)
    if (snippets.length === 0) {
      snippets.push({
        line: 1,
        content: lines.slice(0, 5).join('\n') + '\n...'
      });
    }

    // Simple relevance: Prioritize path matches over content
    const relevance = file.path.toLowerCase().includes(q.toLowerCase()) ? 10 : 1;

    return {
      repo: file.repo,
      owner: file.owner,
      path: file.path,
      relevance,
      snippets // Array of top 3 snippets
    };
  });

  // 3. Save History (Async, don't wait for response)
  const trimmedQuery = q.trim();
  if (req.user && trimmedQuery.length >= 3) {
    // Avoid duplicate spam: Upsert based on userId, repo, and query
    // This keeps the history clean but updates the 'last searched' time
    SearchHistory.findOneAndUpdate(
      { 
        userId: req.user.id, 
        owner: req.query.owner || 'global',
        repo: repo || 'global', 
        query: trimmedQuery 
      },
      { 
        timestamp: new Date() 
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    ).catch(err => console.error('Error saving search history:', err));
  }

  // 3. Fallback: If no results found in DB but searching a specific repo
  let finalResults = formattedResults;
  let finalTotal = totalResults;
  if (results.length === 0 && repo && req.query.owner) {
    console.log(`[SearchFallback] No local results for ${req.query.owner}/${repo}. Proxying to GitHub...`);
    try {
      const githubResults = await githubService.client.get(`/search/code?q=${q}+repo:${req.query.owner}/${repo}`);
      if (githubResults.data.items && githubResults.data.items.length > 0) {
        finalResults = githubResults.data.items.slice(0, 10).map(item => ({
          path: item.path,
          repo: repo,
          owner: req.query.owner,
          content: '// Content streaming from GitHub live... \n// Indexing in progress for deep analysis.',
          snippets: [{ line: 1, content: 'Indexing in progress...' }],
          relevance: 0,
          isLive: true
        }));
        finalTotal = githubResults.data.total_count;
      }
    } catch (err) {
      console.warn('[SearchFallback] GitHub Search Proxy failed:', err.message);
    }
  }

  res.status(200).json({
    status: 'success',
    pagination: {
      totalResults: finalTotal,
      totalPages: Math.ceil(finalTotal / limitNum),
      currentPage: pageNum,
      limit: limitNum
    },
    count: finalResults.length,
    data: finalResults
  });
});

/**
 * @desc    Get repository details and indexing status
 * @route   GET /api/v1/repo-details/:owner/:repo
 */
exports.getRepoDetails = catchAsync(async (req, res, next) => {
  const { owner, repo } = req.params;

  const repository = await Repository.findOne({ 
    owner: { $regex: new RegExp(`^${owner}$`, 'i') }, 
    name: { $regex: new RegExp(`^${repo}$`, 'i') } 
  });

  if (!repository) {
    return next(new AppError('Repository not found in SAMIndex database', 404));
  }

  // 4. Update User-Repo Association for Personalization
  if (req.user && repository) {
    const UserRepo = require('../models/userRepo.model');
    await UserRepo.findOneAndUpdate(
      { userId: req.user.id, repositoryId: repository._id },
      { lastAccessedAt: new Date() },
      { upsert: true }
    ).catch(err => console.error('Error updating UserRepo link:', err));
  }

  res.status(200).json({
    status: 'success',
    data: repository
  });
});

/**
 * @desc    Get AI-powered explanation for a code snippet
 * @route   POST /api/v1/ai-explain
 */
exports.getAIExplanation = catchAsync(async (req, res, next) => {
  const { code, fileName } = req.body;

  if (!code) {
    return next(new AppError('Code snippet is required for neural analysis', 400));
  }

  const aiService = require('../services/ai.service');
  const explanation = await aiService.explainCode(code, fileName || 'Unknown File');

  res.status(200).json({
    status: 'success',
    data: { explanation }
  });
});

/**
 * @desc    Get AI-powered summary for a repository
 * @route   POST /api/v1/repo-summary
 */
exports.getRepoSummary = catchAsync(async (req, res, next) => {
  const { owner, repo } = req.body;

  if (!owner || !repo) {
    return next(new AppError('Owner and repo name are required', 400));
  }

  const githubService = require('../services/github.service');
  const aiService = require('../services/ai.service');

  try {
    // 1. Try to find README
    const repoFiles = await githubService.getRepoFiles(owner, repo);
    const readmeFile = repoFiles.find(f => f.path.toLowerCase() === 'readme.md');
    
    let content = '';
    if (readmeFile) {
      content = await githubService.getBlobContent(owner, repo, readmeFile.sha);
    } else {
      // Fallback: use top 10 file paths as context
      content = `File Structure: ${repoFiles.slice(0, 15).map(f => f.path).join(', ')}`;
    }

    const summary = await aiService.summarizeRepository(content, repo);

    // 2. Persist the summary to the database
    const Repository = require('../models/repository.model');
    await Repository.findOneAndUpdate(
      { 
        owner: { $regex: new RegExp(`^${owner}$`, 'i') }, 
        name: { $regex: new RegExp(`^${repo}$`, 'i') } 
      },
      { description: summary }
    );

    res.status(200).json({
      status: 'success',
      data: { summary }
    });
  } catch (err) {
    console.error('[Controller] Repo summary failed:', err.message);
    res.status(200).json({
      status: 'success',
      data: { summary: "Neural Analysis Offline: Workspace context established but summary generation skipped." }
    });
  }
});
