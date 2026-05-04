const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CodeFile = require('./src/models/codeFile.model');

dotenv.config();

async function testHybrid() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const q = 'imp';
  const searchQuery = {
    $or: [
      { $text: { $search: q } },
      { content: { $regex: q, $options: 'i' } },
      { path: { $regex: q, $options: 'i' } },
      { repo: { $regex: q, $options: 'i' } }
    ]
  };

  try {
    const results = await CodeFile.find(searchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .lean();
    
    console.log(`Found ${results.length} results for "${q}"`);
    if (results.length > 0) {
      console.log('Sample match path:', results[0].path);
    }
  } catch (err) {
    console.error('Hybrid search failed:', err.message);
  }

  process.exit(0);
}

testHybrid();
