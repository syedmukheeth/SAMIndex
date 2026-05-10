const Redis = require('ioredis');

const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times) => {
    if (times > 50) {
      console.error('[Redis] Max retries exceeded. Manual intervention required.');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) return true;
    return false;
  }
};

const connection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...redisOptions
    });

let isConnected = false;

connection.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
  isConnected = false;
});

connection.on('connect', () => {
  isConnected = true;
  const target = process.env.REDIS_URL ? 'Cloud' : `${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  console.log(`[Redis] Connected to ${target}`);
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
