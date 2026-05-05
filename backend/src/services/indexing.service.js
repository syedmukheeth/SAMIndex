const githubService = require('./github.service');
const CodeFile = require('../models/codeFile.model');
const Repository = require('../models/repository.model');
const cache = require('../utils/cache');

/**
 * @desc Core indexing logic that can be run via BullMQ Worker OR directly (fallback)
 * @param {Object} data - { owner, repo, preFetchedFiles, jobId }
 * @param {Object} job - Optional BullMQ job object for progress updates
 */
const processIndexing = async (data, job = null) => {
  const { jobId, preFetchedFiles } = data;
  const owner = data.owner.toLowerCase();
  const repo = data.repo.toLowerCase();
  const id = jobId || `local-${Date.now()}`;
  
  console.log(`[IndexingService] Starting indexing for ${owner}/${repo} (ID: ${id})`);
  
  try {
    // 1. Update Progress
    if (job) {
      await job.updateProgress(10);
    } else if (jobId) {
      cache.set(`job:${jobId}`, { state: 'active', progress: 10, result: { filesIndexed: 0 } }, 3600);
    }

    // 2. Fetch file list
    const filePaths = preFetchedFiles || await githubService.getRepoFiles(owner, repo);
    console.log(`[IndexingService] Discovered ${filePaths.length} potential files for ${owner}/${repo}`);

    if (filePaths.length === 0) {
      console.error(`[IndexingService] CRITICAL: No indexable files found for ${owner}/${repo}.`);
      
      // Still update metadata so the UI knows we scanned it
      await Repository.findOneAndUpdate(
        { owner, name: repo },
        { isIndexed: true, lastIndexedAt: new Date() }
      );
      
      throw new Error(`Repository "${repo}" appears empty or inaccessible. Verify your GitHub Token permissions.`);
    }

    const CONCURRENCY_LIMIT = 10; // Boosted for high-fidelity scanning speed
    let indexedCount = 0;
    let failCount = 0;
    const bulkOperations = [];

    // 3. Process Files in Batches
    for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
      const batch = filePaths.slice(i, i + CONCURRENCY_LIMIT);
      
      const contents = await Promise.all(
        batch.map(async (fileInfo) => {
          const { path, size } = fileInfo;
          
          if (size > 1024000) { // Skip files > 1MB
            return null;
          }

          try {
            const content = await githubService.getFileContent(owner, repo, path);
            if (!content || content.trim().length === 0) return null;
            
            const ext = path.slice((Math.max(0, path.lastIndexOf(".")) || Infinity) + 1);
            return { repo, owner, path, content, lang: ext };
          } catch (err) {
            failCount++;
            console.error(`[IndexingService] Failed to fetch ${path}:`, err.message);
            return null;
          }
        })
      );

      contents.forEach(file => {
        if (file) {
          bulkOperations.push({
            updateOne: {
              filter: { owner: file.owner, repo: file.repo, path: file.path },
              update: { 
                ...file, 
                lastIndexedSession: id,
                updatedAt: new Date()
              },
              upsert: true
            }
          });
          indexedCount++;
        }
      });

      if (bulkOperations.length >= 20) {
        try {
          await CodeFile.bulkWrite(bulkOperations, { ordered: false });
          bulkOperations.length = 0;
          
          if (job) {
            const progress = Math.min(10 + Math.floor((i / filePaths.length) * 85), 95);
            await job.updateProgress(progress);
          } else if (jobId) {
            const progress = Math.min(10 + Math.floor((i / filePaths.length) * 85), 95);
            cache.set(`job:${jobId}`, { 
              state: 'active', 
              progress, 
              result: { 
                filesIndexed: indexedCount,
                filesFound: filePaths.length 
              } 
            }, 3600);
          }
        } catch (bErr) {
          console.error('[IndexingService] bulkWrite partially failed:', bErr.message);
          bulkOperations.length = 0;
        }
      }
    }

    // Final commit
    if (bulkOperations.length > 0) {
      try {
        await CodeFile.bulkWrite(bulkOperations, { ordered: false });
      } catch (fErr) {
        console.error('[IndexingService] Final bulkWrite failed:', fErr.message);
      }
    }

    // 4. Prune Ghost Files (Only if we had high success rate)
    if (indexedCount > (filePaths.length * 0.5)) {
      console.log(`[IndexingService] Pruning old files for ${owner}/${repo}`);
      const pruneResult = await CodeFile.deleteMany({
        owner,
        repo,
        lastIndexedSession: { $ne: id }
      });
      console.log(`[IndexingService] Pruned ${pruneResult.deletedCount} files.`);
    }

    if (job) await job.updateProgress(100);
    if (jobId && !job) {
      cache.set(`job:${jobId}`, { 
        state: 'completed', 
        progress: 100, 
        result: { 
          filesFound: filePaths.length,
          filesIndexed: indexedCount,
          filesFailed: failCount 
        } 
      }, 3600);
    }
    
    // 5. Update Repository Metadata
    try {
      await Repository.findOneAndUpdate(
        { owner, name: repo },
        { isIndexed: true, lastIndexedAt: new Date() }
      );
    } catch (repoErr) {
      console.warn(`[IndexingService] Failed to update repo metadata: ${repoErr.message}`);
    }

    console.log(`[IndexingService] COMPLETED: ${indexedCount} indexed, ${failCount} failed.`);
    
    return {
      filesFound: filePaths.length,
      filesIndexed: indexedCount,
      filesFailed: failCount,
      sessionId: id
    };
  } catch (error) {
    console.error(`[IndexingService] Critical failure:`, error.message);
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

module.exports = {
  processIndexing
};
