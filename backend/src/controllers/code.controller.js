const indexQueue = require('../queues/index.queue');
const githubService = require('../services/github.service');
const cache = require('../utils/cache');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const CodeFile = require('../models/codeFile.model');

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
  // We fetch the file list here to validate limits before queuing
  const filePaths = await githubService.getRepoFiles(owner, repo);
  
  if (filePaths.length > 5000) {
    return next(new AppError(`Repository too large (${filePaths.length} files). Max limit is 5000 files for indexing.`, 400));
  }

  // 3. Add to BullMQ
  const job = await indexQueue.add(`index-${owner}-${repo}`, {
    owner,
    repo,
    preFetchedFiles: filePaths // Pass these to worker so it doesn't fetch again
  });

  // 3. Mark as pending in cache (briefly)
  cache.set(cacheKey, 'pending', 300);

  res.status(202).json({
    status: 'success',
    message: 'Indexing task added to background queue',
    data: {
      jobId: job.id,
      owner,
      repo
    }
  });
});

/**
 * @desc    Check status of an indexing job
 * @route   GET /api/v1/index-status/:jobId
 */
exports.getIndexStatus = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
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
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // 1. Run Search and Count in Parallel
  const [results, totalResults] = await Promise.all([
    CodeFile.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limitNum)
      .select('repo path owner content')
      .lean(),
    CodeFile.countDocuments({ $text: { $search: q } })
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

    return {
      repo: file.repo,
      owner: file.owner,
      path: file.path,
      relevance: file.score,
      snippets // Array of top 3 snippets
    };
  });

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
