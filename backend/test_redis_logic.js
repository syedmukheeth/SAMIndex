const { isRedisConnected } = require('./src/config/redis');
const dotenv = require('dotenv');

dotenv.config();

console.log('Initial isRedisConnected:', isRedisConnected());

setTimeout(() => {
  console.log('After 2s isRedisConnected:', isRedisConnected());
  process.exit(0);
}, 2000);
