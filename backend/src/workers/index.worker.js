const { Worker } = require('bullmq');
const connection = require('../config/redis');
const githubService = require('../services/github.service');
const CodeFile = require('../models/codeFile.model');

const { processIndexing } = require('../services/indexing.service');

const indexWorker = new Worker('repo-index', async (job) => {
  return await processIndexing(job.data, job);
}, { 
  connection,
  concurrency: 2
});

indexWorker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} completed!`);
});

indexWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = indexWorker;
