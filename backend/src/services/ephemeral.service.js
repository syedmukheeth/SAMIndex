const redis = require('../config/redis');
const path = require('path');

/**
 * Ephemeral Search Infrastructure Engine
 * Manages transient repository sessions and high-speed Redis-based retrieval.
 */
class EphemeralSearchService {
  constructor() {
    this.TTL = 3600; // 1 Hour session lifetime
    this.prefix = 'ephemeral:v1';
  }

  /**
   * Initializes a new transient session
   */
  async createSession(owner, repo) {
    const sessionId = `${owner.toLowerCase()}:${repo.toLowerCase()}`;
    const key = `${this.prefix}:meta:${sessionId}`;
    
    await redis.hset(key, {
      status: 'initializing',
      createdAt: Date.now(),
      filesCount: 0,
      isSearchReady: 'false'
    });
    
    await redis.expire(key, this.TTL);
    return sessionId;
  }

  /**
   * Indexes a file into the transient Redis layer
   */
  async indexFile(sessionId, file) {
    const { path: filePath, content, lang } = file;
    const fileKey = `${this.prefix}:repo:${sessionId}:file:${filePath}`;
    
    // 1. Store raw content for retrieval
    await redis.set(fileKey, JSON.stringify({ content, lang, path: filePath }), 'EX', this.TTL);

    // 2. Build Inverted Index (Keyword Search)
    // Extract words (simple alphanumeric split for ephemeral speed)
    const words = Array.from(new Set(content.toLowerCase().split(/[^a-z0-9]+/)));
    
    const pipeline = redis.pipeline();
    
    // We index words >= 2 chars for better coverage in ephemeral mode
    const filteredWords = words.filter(w => w.length >= 2 && w.length <= 30);
    
    for (const word of filteredWords) {
      const idxKey = `${this.prefix}:repo:${sessionId}:idx:${word}`;
      pipeline.sadd(idxKey, filePath);
      pipeline.expire(idxKey, this.TTL);
    }
    
    // 3. Store in a file set for deep scanning fallback
    const setKey = `${this.prefix}:repo:${sessionId}:files`;
    pipeline.sadd(setKey, filePath);
    pipeline.expire(setKey, this.TTL);

    // 4. Update Metadata
    const metaKey = `${this.prefix}:meta:${sessionId}`;
    pipeline.hincrby(metaKey, 'filesCount', 1);
    
    await pipeline.exec();
    
    // Trigger Search Unlock if enough files are present (Early unlock)
    const count = await redis.hget(metaKey, 'filesCount');
    if (parseInt(count) >= 15) {
      await redis.hset(metaKey, 'isSearchReady', 'true');
    }
  }

  /**
   * Finalizes the session, ensuring search is unlocked
   */
  async finalizeSession(sessionId) {
    const metaKey = `${this.prefix}:meta:${sessionId}`;
    await redis.hset(metaKey, {
      status: 'completed',
      isSearchReady: 'true'
    });
  }

  /**
   * High-speed transient keyword search
   */
  async search(sessionId, query) {
    const startTime = Date.now();
    const q = query.toLowerCase().trim();
    const words = q.split(/[^a-z0-9]+/);
    
    if (words.length === 0) return [];

    // Intersect sets for multiple keywords
    const keys = words.filter(w => w.length >= 2).map(w => `${this.prefix}:repo:${sessionId}:idx:${w}`);
    let matchingPaths = keys.length > 0 ? await redis.sinter(keys) : [];
    
    // DEEP SCAN FALLBACK: If no keyword matches or query is very short, perform regex scan on the repo
    if (matchingPaths.length === 0) {
      console.log(`[EphemeralSearch] Keyword miss for "${q}". Triggering Deep Scan...`);
      const allFilesKey = `${this.prefix}:repo:${sessionId}:files`;
      const allPaths = await redis.smembers(allFilesKey);
      
      for (const p of allPaths) {
        if (p.toLowerCase().includes(q)) {
          matchingPaths.push(p);
          if (matchingPaths.length >= 10) break; // Cap ephemeral results
        }
      }

      // If still no path matches, we could scan content, but that's expensive.
      // For ephemeral, we'll stick to path-based deep scan as first fallback.
    }

    if (!matchingPaths || matchingPaths.length === 0) return [];

    // Retrieve full file data for the top 10 matches (Ephemeral limit)
    const topPaths = matchingPaths.slice(0, 10);
    const results = await Promise.all(
      topPaths.map(async (p) => {
        const data = await redis.get(`${this.prefix}:repo:${sessionId}:file:${p}`);
        return data ? JSON.parse(data) : null;
      })
    );

    return results.filter(r => r !== null).map(r => ({
      ...r,
      owner: sessionId.split(':')[0],
      repo: sessionId.split(':')[1],
      score: 1.0 // Ephemeral search is boolean match for now
    }));
  }

  /**
   * Session Health Check
   */
  async getSessionStatus(sessionId) {
    const meta = await redis.hgetall(`${this.prefix}:meta:${sessionId}`);
    return meta;
  }
}

module.exports = new EphemeralSearchService();
