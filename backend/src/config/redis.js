const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
};

const connection = new Redis({
  ...redisConfig,
  retryStrategy: (times) => {
    // Stop retrying after 1 attempt if it's local dev and we want to allow fallback
    if (times > 1) {
      console.warn('[Redis] Connection failed. Fallback mode active.');
      return null;
    }
    return 2000; // retry once after 2 seconds
  }
});

let isConnected = false;

connection.on('error', (err) => {
  if (isConnected) {
    console.error('Redis Connection Error:', err.message);
  }
  isConnected = false;
});

connection.on('connect', () => {
  isConnected = true;
  console.log(`Connected to Redis at ${redisConfig.host}:${redisConfig.port}`);
});

connection.on('close', () => {
  isConnected = false;
});

module.exports = connection;
module.exports.isRedisConnected = () => isConnected;
