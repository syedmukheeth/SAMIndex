const indexQueue = require('../queues/index.queue');
const githubService = require('../services/github.service');
const cache = require('../utils/cache');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const CodeFile = require('../models/codeFile.model');
const SearchHistory = require('../models/SearchHistory');
const { isRedisConnected } = require('../config/redis');
const indexingService = require('../services/indexing.service');

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
  
  // 2. Pre-flight Check: Check DB status before expensive GitHub traversal
  const existingRepo = await Repository.findOne({ 
    owner: owner.toLowerCase(), 
    name: repo.toLowerCase() 
  });

  if (!force && existingRepo?.isIndexed) {
    cache.set(cacheKey, 'completed', 3600);
    return res.status(200).json({
      status: 'success',
      message: `Neural Link Established for ${owner}/${repo}`,
      data: { cached: true, isIndexed: true }
    });
  }

  // 3. PRE-FLIGHT: Check repository size/file count
  const filePaths = await githubService.getRepoFiles(owner, repo);
  
  if (filePaths.length === 0) {
    return next(new AppError('No indexable code files found in this repository. Supported types: .js, .ts, .jsx, .tsx, .py, .java, .cpp, .go, etc.', 400));
  }

  if (filePaths.length > 5000) {
    return next(new AppError(`Repository too large (${filePaths.length} files). Max limit is 5000 files for indexing.`, 400));
  }

  // 3. Queue vs Fallback
  if (isRedisConnected()) {
    console.log(`[Queue] Adding ${owner}/${repo} to BullMQ`);
    const job = await indexQueue.add(`index-${owner}-${repo}`, {
      owner,
      repo,
      preFetchedFiles: filePaths
    });

    cache.set(cacheKey, 'pending', 300);

    return res.status(202).json({
      status: 'success',
      message: 'Indexing task added to background queue',
      data: { jobId: job.id, owner, repo }
    });
  } else {
    // FALLBACK: Synchronous indexing for local development
    console.log(`[Local Fallback] Redis unavailable. Starting synchronous indexing for ${owner}/${repo}`);
    
    // We run this "in the background" from the user's perspective by returning 202 immediately
    // but starting the promise without awaiting it (or using setImmediate)
    const localJobId = `local:${owner}:${repo}:${Date.now()}`;
    
    // Start indexing but don't await (it runs in background node process)
    indexingService.processIndexing({ 
      owner, 
      repo, 
      preFetchedFiles: filePaths,
      jobId: localJobId
    }).catch(err => console.error('[Local Fallback Error]:', err));

    cache.set(cacheKey, 'pending', 300);

    return res.status(202).json({
      status: 'success',
      message: 'Redis unavailable: Started local synchronous indexing fallback',
      data: { jobId: localJobId, owner, repo, fallback: true }
    });
  }
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
    searchQuery.repo = repo;
    if (req.query.owner) searchQuery.owner = req.query.owner;
  }

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

  res.status(200).json({
    status: 'success',
    pagination: {
      totalResults,
      totalPages: Math.ceil(totalResults / limitNum),
      currentPage: pageNum,
      limit: limitNum
    },
    count: formattedResults.length,
    data: formattedResults
  });
});

/**
 * @desc    Get repository details and indexing status
 * @route   GET /api/v1/repo-details/:owner/:repo
 */
exports.getRepoDetails = catchAsync(async (req, res, next) => {
  const { owner, repo } = req.params;

  const repository = await Repository.findOne({ 
    owner: owner.toLowerCase(), 
    name: repo.toLowerCase() 
  });

  if (!repository) {
    return next(new AppError('Repository not found in SAMIndex database', 404));
  }

  res.status(200).json({
    status: 'success',
    data: repository
  });
});
