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
    
    // We only index words between 3 and 20 chars to keep Redis clean
    const filteredWords = words.filter(w => w.length >= 3 && w.length <= 20);
    
    for (const word of filteredWords) {
      const idxKey = `${this.prefix}:repo:${sessionId}:idx:${word}`;
      pipeline.sadd(idxKey, filePath);
      pipeline.expire(idxKey, this.TTL);
    }
    
    // 3. Update Metadata
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
    const keys = words.map(w => `${this.prefix}:repo:${sessionId}:idx:${w}`);
    const matchingPaths = await redis.sinter(keys);

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
