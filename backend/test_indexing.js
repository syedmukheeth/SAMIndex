const indexingService = require('./src/services/indexing.service');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function runIndexing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await indexingService.processIndexing({
      owner: 'syedmukheeth',
      repo: 'SAMIndex'
    });

    console.log('Indexing Result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Indexing Failed:', err);
    process.exit(1);
  }
}

runIndexing();
