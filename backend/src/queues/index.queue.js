const { Queue } = require('bullmq');
const connection = require('../config/redis');

const indexQueue = new Queue('repo-index', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

console.log('BullMQ Queue "repo-index" initialized.');

module.exports = indexQueue;
