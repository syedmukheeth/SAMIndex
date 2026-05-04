const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CodeFile = require('./src/models/codeFile.model');

dotenv.config();

async function checkIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const count = await CodeFile.countDocuments({});
    console.log(`Total CodeFiles in DB: ${count}`);

    const sample = await CodeFile.findOne({}).select('owner repo path').lean();
    console.log('Sample CodeFile:', sample);

    // Search for a specific repo if provided in args
    const repoArg = process.argv[2];
    if (repoArg) {
      const [owner, repo] = repoArg.split('/');
      const repoCount = await CodeFile.countDocuments({ owner, repo });
      console.log(`Files for ${owner}/${repo}: ${repoCount}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkIndex();
