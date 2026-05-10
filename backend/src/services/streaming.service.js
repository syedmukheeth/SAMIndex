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
  async processStream(owner, repo, zipStream, job, id, isEphemeral = false) {
    const startTime = Date.now();
    let filesProcessed = 0;
    let totalBytes = 0;
    const repoId = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    const ephemeralService = isEphemeral ? require('./ephemeral.service') : null;

    console.log(`[StreamingIngestor] Starting ${isEphemeral ? 'EPHEMERAL' : 'PROGRESSIVE'} scan for ${repoId}`);
    
    if (isEphemeral) {
      await ephemeralService.createSession(owner, repo);
    }

    return new Promise((resolve, reject) => {
      zipStream
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
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

          // 3. Process File Content
          try {
            const contentBuffer = await entry.buffer();
            const content = contentBuffer.toString('utf-8');
            totalBytes += contentBuffer.length;
            
            // Clean up entry path (GitHub ZIPs usually start with a random root dir)
            const cleanPath = parts.slice(1).join('/');

            // 4. Intelligence Sniffer (NEW: Progressive AI)
            const intelligenceService = require('./intelligence.service');
            const signals = intelligenceService.extractSignals(cleanPath, content);
            if (signals.length > 0) {
              await intelligenceService.processSignals(owner, repo, signals);
            }

            // 5. Persistence Sink (Dual-Mode)
            if (isEphemeral) {
              await ephemeralService.indexFile(`${owner.toLowerCase()}:${repo.toLowerCase()}`, {
                path: cleanPath,
                content,
                lang: ext.substring(1) || 'text'
              });
            } else {
              await CodeFile.findOneAndUpdate(
                { owner: owner.toLowerCase(), repo: repo.toLowerCase(), path: cleanPath },
                {
                  content,
                  lang: ext.substring(1) || 'text',
                  lastIndexedSession: id,
                  updatedAt: new Date()
                },
                { upsert: true }
              );
            }

            filesProcessed++;

            // 6. Progressive Feedback
            if (filesProcessed % 10 === 0) {
               const progress = Math.min(99, Math.floor((filesProcessed / 500) * 100));
               if (job) {
                 job.updateProgress(progress);
                 job.log(`${isEphemeral ? '[Ephemeral]' : '[Neural]'} Indexed ${filesProcessed} files...`);
               }
            }

            // UNLOCK SEARCH EARLY
            if (filesProcessed === 20) {
               console.log(`[StreamingIngestor] Search Unlock Threshold reached for ${repoId}`);
            }

          } catch (err) {
            console.error(`[StreamingIngestor] Failed to process ${fileName}:`, err.message);
            entry.autodrain();
          }
        })
        .on('finish', async () => {
          const duration = (Date.now() - startTime) / 1000;
          console.log(`[StreamingIngestor] Completed ${repoId} in ${duration}s. Mode: ${isEphemeral ? 'EPHEMERAL' : 'PERSISTENT'}`);
          
          if (!isEphemeral) {
            await Repository.findOneAndUpdate(
              { owner: owner.toLowerCase(), name: repo.toLowerCase() },
              { 
                isIndexed: filesProcessed > 0,
                lastIndexedAt: new Date(),
                fileCount: filesProcessed
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
