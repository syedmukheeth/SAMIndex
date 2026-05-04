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
  const { owner, repo, force = false } = req.body;

  if (!owner || !repo) {
    return next(new AppError('Please provide owner and repo name', 400));
  }

  // 1. Check Cache
  const cacheKey = `indexed:${owner.toLowerCase()}:${repo.toLowerCase()}`;
  if (!force && cache.get(cacheKey)) {
    return res.status(200).json({
      status: 'success',
      message: `Repository ${owner}/${repo} is recently indexed`,
      data: { cached: true }
    });
  }

  // 2. PRE-FLIGHT: Check repository size/file count to prevent abuse
  const filePaths = await githubService.getRepoFiles(owner, repo);
  
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

  // Handle Local Fallback Jobs
  if (jobId.startsWith('local:')) {
    const [prefix, owner, repo, timestamp] = jobId.split(':');
    
    // Check if the repo has ANY files indexed
    const count = await CodeFile.countDocuments({ owner, repo });
    
    return res.status(200).json({
      status: 'success',
      data: {
        id: jobId,
        state: count > 0 ? 'completed' : 'active',
        progress: count > 0 ? 100 : 45, 
        result: { fallback: true, filesIndexed: count },
        isFallback: true
      }
    });
  }

  const job = await indexQueue.getJob(jobId);

  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  const state = await job.getState();
  const progress = job.progress;
  const result = job.returnvalue;

  res.status(200).json({
    status: 'success',
    data: {
      id: job.id,
      state,
      progress,
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

  // 1. Build Query (Regex for partial matches across all fields)
  const searchQuery = {
    $or: [
      { content: { $regex: q, $options: 'i' } },
      { path: { $regex: q, $options: 'i' } },
      { repo: { $regex: q, $options: 'i' } },
      { owner: { $regex: q, $options: 'i' } }
    ]
  };

  if (repo) {
    searchQuery.repo = repo;
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

    // Simple relevance: Prioritize path/repo matches over content
    const relevance = file.path.toLowerCase().includes(q.toLowerCase()) || 
                     file.repo.toLowerCase().includes(q.toLowerCase()) ? 10 : 1;

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
