const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
};

const connection = new Redis(redisConfig);

connection.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
});

connection.on('connect', () => {
  console.log(`Connected to Redis at ${redisConfig.host}:${redisConfig.port}`);
});

module.exports = connection;
