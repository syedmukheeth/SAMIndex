const unzipper = require('unzipper');
const CodeFile = require('../models/codeFile.model');
const Repository = require('../models/repository.model');
const UserRepo = require('../models/userRepo.model');
const githubService = require('./github.service');
const path = require('path');

/**
 * Principal Streaming Ingestion Engine
 * Handles entry-by-entry processing of repository contents without disk persistence.
 */
class StreamingIngestionService {
  constructor() {
    this.ignoredDirs = ['node_modules', '.git', '.github', 'dist', 'build', 'vendor', 'venv', '__pycache__'];
    this.allowedExtensions = [
      '.js', '.ts', '.jsx', '.tsx', 
      '.cpp', '.c', '.h', '.hpp', '.cc',
      '.py', '.java', '.json', '.go', 
      '.rb', '.php', '.cs', '.sh', 
      '.yml', '.yaml', '.md', '.sql', 
      '.rs', '.swift', '.kt', '.kts'
    ];
  }

  /**
   * Main entry point for streaming ingestion (Dual-Mode)
   * @param {Boolean} isEphemeral - If true, bypasses MongoDB persistence
   */
  async processStream(owner, repo, zipStream, job, id, isEphemeral = false, branch = 'main') {
    const startTime = Date.now();
    let filesProcessed = 0;
    let totalBytes = 0;
    const repoId = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    const ephemeralService = isEphemeral ? require('./ephemeral.service') : null;

    console.log(`[StreamingIngestor] Starting ${isEphemeral ? 'EPHEMERAL' : 'PROGRESSIVE'} scan for ${repoId}`);
    
    if (isEphemeral) {
      await ephemeralService.createSession(owner, repo);
    }

    const pendingTasks = [];
    let isSearchUnlockedEmitted = false;

    return new Promise((resolve, reject) => {
      zipStream
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const type = entry.type; // 'Directory' or 'File'

          // 1. Skip Directories and Hidden files
          if (type === 'Directory' || fileName.includes('/.') || fileName.startsWith('.')) {
            entry.autodrain();
            return;
          }

          // 2. Filter Ignored Dirs and Extensions
          const parts = fileName.split('/');
          const hasIgnoredDir = parts.some(part => this.ignoredDirs.includes(part));
          const ext = path.extname(fileName).toLowerCase();

          if (hasIgnoredDir || !this.allowedExtensions.includes(ext)) {
            entry.autodrain();
            return;
          }

          // 3. Process File Content (NON-BLOCKING PARALLEL TASK)
          const task = (async () => {
            try {
              const contentBuffer = await entry.buffer();
              const content = contentBuffer.toString('utf-8');
              totalBytes += contentBuffer.length;
              
              const cleanPath = parts.slice(1).join('/');

              // 4. Intelligence Sniffer (Backgrounded for Ephemeral)
              const intelligenceService = require('./intelligence.service');
              const signals = intelligenceService.extractSignals(cleanPath, content);
              if (signals.length > 0) {
                // Don't await for ephemeral to keep speed maxed
                intelligenceService.processSignals(owner, repo, signals).catch(() => {});
              }

              // 5. Persistence Sink (Parallel)
              if (isEphemeral) {
                await ephemeralService.indexFile(`${owner.toLowerCase()}:${repo.toLowerCase()}`, {
                  path: cleanPath,
                  content,
                  lang: ext.substring(1) || 'text',
                  branch
                });
              } else {
                await CodeFile.findOneAndUpdate(
                  { owner: owner.toLowerCase(), repo: repo.toLowerCase(), path: cleanPath },
                  {
                    content,
                    lang: ext.substring(1) || 'text',
                    lastIndexedSession: id,
                    branch,
                    updatedAt: new Date()
                  },
                  { upsert: true }
                );
              }

              filesProcessed++;

              // 6. Progressive Feedback & Early Unlock
              if (filesProcessed % 10 === 0 && job) {
                const progress = Math.min(99, Math.floor((filesProcessed / 500) * 100));
                job.updateProgress(progress);
              }

              // HYPER-FAST UNLOCK (Millisecond Feel)
              if (isEphemeral && filesProcessed >= 5 && !isSearchUnlockedEmitted) {
                 isSearchUnlockedEmitted = true;
                 console.log(`[TurboIngestor] Direct Search Unlocked for ${repoId} at ${filesProcessed} files.`);
              }

            } catch (err) {
              console.error(`[TurboIngestor] Failed to process ${fileName}:`, err.message);
              entry.autodrain();
            }
          })();

          pendingTasks.push(task);
        })
        .on('finish', async () => {
          // Wait for all parallel indexing tasks to finish
          await Promise.all(pendingTasks);
          
          const duration = (Date.now() - startTime) / 1000;
          console.log(`[StreamingIngestor] Completed ${repoId} in ${duration}s. Mode: ${isEphemeral ? 'EPHEMERAL' : 'PERSISTENT'}`);
          
          if (!isEphemeral) {
            await Repository.findOneAndUpdate(
              { owner: owner.toLowerCase(), name: repo.toLowerCase() },
              { 
                isIndexed: filesProcessed > 0,
                lastIndexedAt: new Date(),
                fileCount: filesProcessed,
                defaultBranch: branch
              },
              { upsert: true }
            );
          } else {
            // NEW: Ensure ephemeral search is unlocked on finish
            const ephemeralService = require('./ephemeral.service');
            await ephemeralService.finalizeSession(`${owner.toLowerCase()}:${repo.toLowerCase()}`);
          }

          resolve({
            filesIndexed: filesProcessed,
            duration,
            totalBytes,
            mode: isEphemeral ? 'ephemeral' : 'persistent'
          });
        })
        .on('error', (err) => {
          console.error(`[StreamingIngestor] Stream Error for ${repoId}:`, err);
          reject(err);
        });
    });
  }
}

module.exports = new StreamingIngestionService();
