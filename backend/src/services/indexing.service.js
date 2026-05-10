const githubService = require('./github.service');
const CodeFile = require('../models/codeFile.model');
const Repository = require('../models/repository.model');
const cache = require('../utils/cache');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const execAsync = promisify(exec);
const fsPromises = fs.promises;

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
      cache.set(`job:${jobId}`, { state: 'active', progress: 5, result: { filesIndexed: 0 } }, 3600);
    }

    // NEW: TURBO INDEXING STRATEGY (ZIP Based)
    // Using os.tmpdir() to ensure writability on cloud platforms like Render
    const tempRoot = path.join(os.tmpdir(), 'samindex_temp');
    const tempDir = path.join(tempRoot, `${owner}_${repo}_${id}`);
    const zipPath = `${tempDir}.zip`;
    
    console.log(`[TurboIndexer] Temp path: ${tempDir}`);
    
    try {
      if (!fs.existsSync(path.dirname(tempDir))) {
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
      }

      console.log(`[TurboIndexer] Downloading ZIP for ${owner}/${repo}...`);
      if (job) await job.updateProgress(15);
      
      const downloadSuccess = await githubService.downloadRepoZip(owner, repo, zipPath);
      
      if (downloadSuccess) {
        console.log(`[TurboIndexer] Extracting ZIP to ${tempDir}...`);
        if (job) await job.updateProgress(25);
        
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        // Use a more robust extraction command for Linux/macOS/Windows
        const tarCmd = process.platform === 'win32' 
          ? `tar -xf "${zipPath}" -C "${tempDir}" --strip-components=1`
          : `tar -xf "${zipPath}" -C "${tempDir}" --strip-components=1`;
          
        await execAsync(tarCmd);
        
        console.log(`[TurboIndexer] Scanning extracted files...`);
        const files = [];
        const getAllFiles = async (dirPath) => {
          const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              await getAllFiles(fullPath);
            } else {
              const relPath = path.relative(tempDir, fullPath).replace(/\\/g, '/');
              const ext = `.${relPath.split('.').pop()}`;
              const allowedExtensions = [
                '.js', '.ts', '.jsx', '.tsx', 
                '.cpp', '.c', '.h', '.hpp', '.cc',
                '.py', '.java', '.json', '.go', 
                '.rb', '.php', '.cs', '.sh', 
                '.yml', '.yaml', '.md', '.sql', 
                '.rs', '.swift', '.kt', '.kts'
              ];
              if (allowedExtensions.includes(ext)) {
                const stats = await fsPromises.stat(fullPath);
                if (stats.size < 1024000) { // 1MB limit
                  files.push({ fullPath, relPath, size: stats.size });
                } else {
                  console.log(`[TurboIndexer] Skipping large file: ${relPath} (${Math.round(stats.size/1024)}KB)`);
                }
              }
            }
          }
        };

        await getAllFiles(tempDir);
        console.log(`[TurboIndexer] SUCCESS: Discovered ${files.length} code files via ZIP.`);

        if (files.length > 0) {
          let indexedCount = 0;
          const bulkOps = [];
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const content = await fsPromises.readFile(file.fullPath, 'utf-8');
            
            bulkOps.push({
              updateOne: {
                filter: { owner, repo, path: file.relPath },
                update: {
                  owner,
                  repo,
                  path: file.relPath,
                  content,
                  lang: file.relPath.split('.').pop(),
                  lastIndexedSession: id,
                  updatedAt: new Date()
                },
                upsert: true
              }
            });

            if (bulkOps.length >= 100) {
              console.log(`[TurboIndexer] Committing batch of ${bulkOps.length} files...`);
              await CodeFile.bulkWrite(bulkOps, { ordered: false });
              indexedCount += bulkOps.length;
              bulkOps.length = 0;
              
              const progress = Math.min(25 + Math.floor((i / files.length) * 70), 95);
              if (job) await job.updateProgress(progress);
              else if (jobId) cache.set(`job:${jobId}`, { state: 'active', progress, result: { filesIndexed: indexedCount } }, 3600);
            }
          }

          if (bulkOps.length > 0) {
            await CodeFile.bulkWrite(bulkOps, { ordered: false });
            indexedCount += bulkOps.length;
          }

          // Cleanup
          try {
            await fsPromises.rm(tempDir, { recursive: true, force: true });
            await fsPromises.unlink(zipPath);
          } catch (e) { console.warn('Cleanup failed:', e.message); }

          // NEW: Auto-generate AI summary if README exists
          let repoSummary = null;
          const readmeFile = files.find(f => f.relPath.toLowerCase() === 'readme.md');
          if (readmeFile) {
            try {
              const aiService = require('./ai.service');
              const readmeContent = await fsPromises.readFile(readmeFile.fullPath, 'utf-8');
              repoSummary = await aiService.summarizeRepository(readmeContent, repo);
            } catch (aiErr) {
              console.warn('[IndexingService] AI Summary failed:', aiErr.message);
            }
          }

          return await finalizeIndexing(owner, repo, id, files.length, indexedCount, 0, job, jobId, repoSummary);
        }
      }
    } catch (turboErr) {
      console.error(`[TurboIndexer] Failed: ${turboErr.message}. Falling back to API indexing.`);
      // Cleanup on failure
      try {
        if (fs.existsSync(tempDir)) await fsPromises.rm(tempDir, { recursive: true, force: true });
        if (fs.existsSync(zipPath)) await fsPromises.unlink(zipPath);
      } catch (e) {}
    }

    // FALLBACK TO API INDEXING (if ZIP fails)
    const filePaths = preFetchedFiles || await githubService.getRepoFiles(owner, repo);
    console.log(`[IndexingService] Discovered ${filePaths.length} potential files for ${owner}/${repo}`);

    if (filePaths.length === 0) {
      console.error(`[IndexingService] CRITICAL: No indexable files found for ${owner}/${repo}.`);
      
      // Still update metadata so the UI knows we scanned it
      await Repository.findOneAndUpdate(
        { 
          owner: { $regex: new RegExp(`^${owner}$`, 'i') }, 
          name: { $regex: new RegExp(`^${repo}$`, 'i') } 
        },
        { isIndexed: true, lastIndexedAt: new Date() }
      );
      
      throw new Error(`Repository "${repo}" appears empty or contains no supported code files.`);
    }

    const CONCURRENCY_LIMIT = 15; // Increased for performance
    let indexedCount = 0;
    let failCount = 0;
    const bulkOperations = [];

    // 3. Process Files in Batches
    for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
      const batch = filePaths.slice(i, i + CONCURRENCY_LIMIT);
      
      const contents = await Promise.all(
        batch.map(async (fileInfo) => {
          const { path, size, sha } = fileInfo;
          
          if (size > 1024000) { // Skip files > 1MB
            return null;
          }

          try {
            // HIGH PERFORMANCE: Use SHA instead of path for faster retrieval
            const content = await githubService.getBlobContent(owner, repo, sha);
            if (!content || content.trim().length === 0) return null;
            
            const ext = path.slice((Math.max(0, path.lastIndexOf(".")) || Infinity) + 1);
            return { repo, owner, path, content, lang: ext };
          } catch (err) {
            failCount++;
            console.error(`[IndexingService] Failed to fetch ${path} (${sha}):`, err.message);
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

    // NEW: Auto-generate AI summary if README exists (Fallback Mode)
    let repoSummary = null;
    const readmeFile = filePaths.find(f => f.path.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        const aiService = require('./ai.service');
        const readmeContent = await githubService.getBlobContent(owner, repo, readmeFile.sha);
        repoSummary = await aiService.summarizeRepository(readmeContent, repo);
      } catch (aiErr) {
        console.warn('[IndexingService] AI Summary failed (fallback):', aiErr.message);
      }
    }

    return await finalizeIndexing(owner, repo, id, filePaths.length, indexedCount, failCount, job, jobId, repoSummary);
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
