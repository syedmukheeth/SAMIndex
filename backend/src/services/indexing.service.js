const githubService = require('./github.service');
const streamingService = require('./streaming.service');
const CodeFile = require('../models/codeFile.model');
const Repository = require('../models/repository.model');
const cache = require('../utils/cache');

/**
 * Principal Ingestion Orchestrator
 * Pipes GitHub streams into the Streaming Ingestion Service
 */
const processIndexing = async (data, job = null) => {
  const { jobId, isEphemeral = false } = data;
  const owner = data.owner.toLowerCase();
  const repo = data.repo.toLowerCase();
  const id = jobId || `stream-${Date.now()}`;
  
  console.log(`[IndexingService] Initiating ${isEphemeral ? 'EPHEMERAL' : 'STREAM-FIRST'} ingestion for ${owner}/${repo}`);
  
  try {
    // 1. Token Health Check (Fail fast if rate limited)
    const rateLimit = await githubService.getRateLimit();
    if (rateLimit && rateLimit.remaining < 5) {
      throw new Error('GitHub API rate limit critical. Ingestion postponed.');
    }

    if (job) await job.updateProgress(5);

    // 2. Obtain ZIP Stream from GitHub
    console.log(`[IndexingService] Requesting ZIP stream for ${owner}/${repo}...`);
    const zipStream = await githubService.getRepoZipStream(owner, repo);
    
    if (job) await job.updateProgress(10);

    // 3. Handover to Streaming Engine (Entry-by-Entry Processing)
    const result = await streamingService.processStream(owner, repo, zipStream, job || { 
      updateProgress: (p) => cache.set(`job:${jobId}`, { state: 'active', progress: p }, 3600),
      log: (msg) => console.log(`[JobLog] ${msg}`)
    }, id, isEphemeral);

    // 4. Cleanup Old Session Files (Pruning) - SKIP FOR EPHEMERAL
    if (!isEphemeral) {
      console.log(`[IndexingService] Pruning stale files for ${owner}/${repo}`);
      await CodeFile.deleteMany({
        owner,
        repo,
        lastIndexedSession: { $ne: id }
      });
    }

    // 5. Finalize Progress
    if (job) await job.updateProgress(100);
    if (jobId && !job) {
      cache.set(`job:${jobId}`, { 
        state: 'completed', 
        progress: 100, 
        result 
      }, 3600);
    }

    return result;

  } catch (error) {
    console.error(`[IndexingService] STREAM_FAILURE:`, error.message);
    if (jobId && !job) {
      cache.set(`job:${jobId}`, { 
        state: 'failed', 
        progress: 0, 
        failedReason: error.message 
      }, 3600);
    }
    throw error;
  }
};

const finalizeIndexing = async (owner, repo, id, found, indexed, failed, job, jobId, repoSummary = null) => {
  // Prune Ghost Files (Only if we had high success rate)
  if (indexed > (found * 0.5)) {
    console.log(`[IndexingService] Pruning old files for ${owner}/${repo}`);
    await CodeFile.deleteMany({
      owner,
      repo,
      lastIndexedSession: { $ne: id }
    });
  }

  if (job) await job.updateProgress(100);
  if (jobId && !job) {
    cache.set(`job:${jobId}`, { 
      state: 'completed', 
      progress: 100, 
      result: { 
        filesFound: found,
        filesIndexed: indexed,
        filesFailed: failed 
      } 
    }, 3600);
  }
  
  // Update Repository Metadata
  await Repository.findOneAndUpdate(
    { 
      owner: { $regex: new RegExp(`^${owner}$`, 'i') }, 
      name: { $regex: new RegExp(`^${repo}$`, 'i') } 
    },
    { 
      isIndexed: true, 
      lastIndexedAt: new Date(),
      description: repoSummary || undefined // Update with AI summary if available
    },
    { upsert: true }
  );

  console.log(`[IndexingService] COMPLETED: ${indexed} indexed, ${failed} failed for ${owner}/${repo}`);
  
  return {
    filesFound: found,
    filesIndexed: indexed,
    filesFailed: failed,
    sessionId: id
  };
};

module.exports = {
  processIndexing
};
