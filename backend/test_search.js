const mongoose = require('mongoose');
const dotenv = require('dotenv');
const CodeFile = require('./src/models/codeFile.model');

dotenv.config();

async function testSearch() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const query = 'imp';

  const regexCount = await CodeFile.countDocuments({ 
    $or: [
      { content: { $regex: query, $options: 'i' } },
      { path: { $regex: query, $options: 'i' } }
    ]
  });
  console.log(`Regex match count for "${query}":`, regexCount);

  try {
    const textCount = await CodeFile.countDocuments({ $text: { $search: query } });
    console.log(`Text search match count for "${query}":`, textCount);
  } catch (err) {
    console.log('Text search failed (maybe index not ready):', err.message);
  }

  process.exit(0);
}

testSearch();
