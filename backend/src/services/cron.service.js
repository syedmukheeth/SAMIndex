const cron = require('node-cron');
const User = require('../models/User');
const githubService = require('./github.service');

/**
 * Initializes background jobs
 * Runs every 24 hours at midnight
 */
const initCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('--- Starting Daily GitHub Data Refresh ---');
    
    try {
      const users = await User.find({}, 'username');
      console.log(`Syncing ${users.length} users...`);

      for (const user of users) {
        try {
          // Sync each user one by one to avoid hitting rate limits too fast
          await githubService.syncUserData(user.username);
          console.log(`Synced: ${user.username}`);
          
          // Optional: Add a small delay between users
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`Failed to sync ${user.username}: ${err.message}`);
        }
      }

      console.log('--- Daily Refresh Completed ---');
    } catch (error) {
      console.error('CRON Error:', error.message);
    }
  });
};

module.exports = initCronJobs;
