const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    // Retry up to 50 times with exponential backoff
    if (times > 50) {
      console.error('[Redis] Max retries exceeded. Manual intervention required.');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  }
};

const connection = new Redis(redisConfig);

let isConnected = false;

connection.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
  isConnected = false;
});

connection.on('connect', () => {
  isConnected = true;
  console.log(`[Redis] Connected to ${redisConfig.host}:${redisConfig.port}`);
});

connection.on('ready', () => {
  isConnected = true;
  console.log('[Redis] Client is ready to handle commands.');
});

connection.on('close', () => {
  isConnected = false;
  console.warn('[Redis] Connection closed.');
});

module.exports = connection;
module.exports.isRedisConnected = () => isConnected;
