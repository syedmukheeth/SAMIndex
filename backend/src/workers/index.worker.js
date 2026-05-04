const { Worker } = require('bullmq');
const connection = require('../config/redis');
const githubService = require('../services/github.service');
const CodeFile = require('../models/codeFile.model');

const indexWorker = new Worker('repo-index', async (job) => {
  const { owner, repo, preFetchedFiles } = job.data;
  console.log(`[Worker] Starting indexing for ${owner}/${repo}`);
  
  try {
    // 1. Fetch file list (if not pre-fetched by controller)
    await job.updateProgress(10);
    const filePaths = preFetchedFiles || await githubService.getRepoFiles(owner, repo);
    console.log(`[Worker] Processing ${filePaths.length} files in ${owner}/${repo}`);

    const CONCURRENCY_LIMIT = 5;
    let indexedCount = 0;
    const processedPaths = new Set();
    const bulkOperations = [];

    // 2. Process Files
    for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
      const batch = filePaths.slice(i, i + CONCURRENCY_LIMIT);
      
      const contents = await Promise.all(
        batch.map(async (fileInfo) => {
          const { path, size } = fileInfo;
          
          // SKIP large files (> 100KB) to prevent memory spikes
          if (size > 102400) {
            console.warn(`[Worker] Skipping large file (${size} bytes): ${path}`);
            return null;
          }

          try {
            const content = await githubService.getFileContent(owner, repo, path);
            if (!content) return null;
            const ext = path.slice((Math.max(0, path.lastIndexOf(".")) || Infinity) + 1);
            return { repo, owner, path, content, lang: ext };
          } catch (err) {
            console.error(`[Worker] Failed to fetch ${path}:`, err.message);
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
                lastIndexedSession: job.id 
              },
              upsert: true
            }
          });
          indexedCount++;
        }
      });

      if (bulkOperations.length >= 50) {
        await CodeFile.bulkWrite(bulkOperations);
        bulkOperations.length = 0;
        
        // Update progress dynamically
        const progress = Math.min(10 + Math.floor((i / filePaths.length) * 80), 90);
        await job.updateProgress(progress);
      }
    }

    // Final commit for remaining operations
    if (bulkOperations.length > 0) {
      await CodeFile.bulkWrite(bulkOperations);
    }

    // 3. Session-based Ghost File Pruning
    // We delete any files for this repo that were NOT updated in this specific job session
    console.log(`[Worker] Pruning ghost files for ${owner}/${repo} (Session: ${job.id})`);
    const pruneResult = await CodeFile.deleteMany({
      owner,
      repo,
      lastIndexedSession: { $ne: job.id }
    });
    console.log(`[Worker] Pruned ${pruneResult.deletedCount} ghost files.`);

    await job.updateProgress(100);
    console.log(`[Worker] Successfully indexed ${indexedCount} files for ${owner}/${repo}`);
    
    return {
      filesFound: filePaths.length,
      filesIndexed: indexedCount,
      pruned: true
    };
  } catch (error) {
    console.error(`[Worker] Critical failure indexing ${owner}/${repo}:`, error);
    throw error; // Let BullMQ handle retry
  }
}, { 
  connection,
  concurrency: 2 // Number of concurrent repos to index
});

indexWorker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} completed!`);
});

indexWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = indexWorker;
