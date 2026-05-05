const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const CodeFileSchema = new mongoose.Schema({
  repo: String,
  owner: String,
  path: String,
  content: String
});

const CodeFile = mongoose.model('CodeFile', CodeFileSchema, 'codefiles');

async function checkCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const counts = await CodeFile.aggregate([
      { $group: { _id: { owner: '$owner', repo: '$repo' }, count: { $sum: 1 } } }
    ]);
    
    console.log('Indexing Statistics:');
    console.log(JSON.stringify(counts, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkCounts();
