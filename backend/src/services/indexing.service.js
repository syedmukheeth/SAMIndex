const githubService = require('./github.service');
const CodeFile = require('../models/codeFile.model');

/**
 * @desc Core indexing logic that can be run via BullMQ Worker OR directly (fallback)
 * @param {Object} data - { owner, repo, preFetchedFiles, jobId }
 * @param {Object} job - Optional BullMQ job object for progress updates
 */
const processIndexing = async (data, job = null) => {
  const { owner, repo, preFetchedFiles, jobId } = data;
  const id = jobId || `local-${Date.now()}`;
  
  console.log(`[IndexingService] Starting indexing for ${owner}/${repo} (ID: ${id})`);
  
  try {
    // 1. Update Progress
    if (job) await job.updateProgress(10);

    // 2. Fetch file list
    const filePaths = preFetchedFiles || await githubService.getRepoFiles(owner, repo);
    console.log(`[IndexingService] Discovered ${filePaths.length} potential files for ${owner}/${repo}`);

    if (filePaths.length === 0) {
      console.warn(`[IndexingService] No files found to index for ${owner}/${repo}`);
      return { filesFound: 0, filesIndexed: 0 };
    }

    const CONCURRENCY_LIMIT = 3; // Reduced for stability
    let indexedCount = 0;
    let failCount = 0;
    const bulkOperations = [];

    // 3. Process Files in Batches
    for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
      const batch = filePaths.slice(i, i + CONCURRENCY_LIMIT);
      
      const contents = await Promise.all(
        batch.map(async (fileInfo) => {
          const { path, size } = fileInfo;
          
          if (size > 1024000) { // Increased to 1MB
            console.log(`[IndexingService] Skipping large file: ${path} (${(size/1024).toFixed(1)}KB)`);
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

      if (bulkOperations.length >= 20) { // Smaller batches for frequent updates
        try {
          await CodeFile.bulkWrite(bulkOperations, { ordered: false });
          bulkOperations.length = 0;
          
          if (job) {
            const progress = Math.min(10 + Math.floor((i / filePaths.length) * 85), 95);
            await job.updateProgress(progress);
          }
        } catch (bErr) {
          console.error('[IndexingService] bulkWrite partially failed:', bErr.message);
          bulkOperations.length = 0; // Clear anyway to continue
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
    console.log(`[IndexingService] COMPLETED: ${indexedCount} indexed, ${failCount} failed.`);
    
    return {
      filesFound: filePaths.length,
      filesIndexed: indexedCount,
      filesFailed: failCount,
      sessionId: id
    };
  } catch (error) {
    console.error(`[IndexingService] Critical failure:`, error.message);
    throw error;
  }
};

module.exports = {
  processIndexing
};
