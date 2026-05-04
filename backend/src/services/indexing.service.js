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

    const CONCURRENCY_LIMIT = 5;
    let indexedCount = 0;
    const bulkOperations = [];

    // 3. Process Files in Batches
    for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
      const batch = filePaths.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`[IndexingService] Processing batch ${Math.floor(i/CONCURRENCY_LIMIT) + 1}/${Math.ceil(filePaths.length/CONCURRENCY_LIMIT)}`);
      
      const contents = await Promise.all(
        batch.map(async (fileInfo) => {
          const { path, size } = fileInfo;
          
          // SKIP extremely large files (> 500KB)
          if (size > 512000) {
            console.log(`[IndexingService] Skipping large file: ${path} (${size} bytes)`);
            return null;
          }

          try {
            const content = await githubService.getFileContent(owner, repo, path);
            if (!content) {
              console.log(`[IndexingService] Empty or null content for: ${path}`);
              return null;
            }
            const ext = path.slice((Math.max(0, path.lastIndexOf(".")) || Infinity) + 1);
            return { repo, owner, path, content, lang: ext };
          } catch (err) {
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
                lastIndexedSession: id 
              },
              upsert: true
            }
          });
          indexedCount++;
        }
      });

      if (bulkOperations.length >= 50) {
        console.log(`[IndexingService] Executing bulkWrite for ${bulkOperations.length} files...`);
        const result = await CodeFile.bulkWrite(bulkOperations);
        console.log(`[IndexingService] bulkWrite success: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
        bulkOperations.length = 0;
        
        if (job) {
          const progress = Math.min(10 + Math.floor((i / filePaths.length) * 80), 90);
          await job.updateProgress(progress);
        }
      }
    }

    // Final commit
    if (bulkOperations.length > 0) {
      console.log(`[IndexingService] Executing final bulkWrite for ${bulkOperations.length} files...`);
      const result = await CodeFile.bulkWrite(bulkOperations);
      console.log(`[IndexingService] final bulkWrite success: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
    }

    // 4. Prune Ghost Files
    console.log(`[IndexingService] Pruning ghost files for ${owner}/${repo} (Session: ${id})`);
    const pruneResult = await CodeFile.deleteMany({
      owner,
      repo,
      lastIndexedSession: { $ne: id }
    });
    console.log(`[IndexingService] Pruned ${pruneResult.deletedCount} old files.`);

    if (job) await job.updateProgress(100);
    console.log(`[IndexingService] COMPLETED: Indexed ${indexedCount} files for ${owner}/${repo}`);
    
    return {
      filesFound: filePaths.length,
      filesIndexed: indexedCount,
      pruned: true,
      sessionId: id
    };
  } catch (error) {
    console.error(`[IndexingService] Critical failure indexing ${owner}/${repo}:`, error);
    throw error;
  }
};

module.exports = {
  processIndexing
};
