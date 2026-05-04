const mongoose = require('mongoose');

const codeFileSchema = new mongoose.Schema(
  {
    repo: {
      type: String,
      required: [true, 'Repository name is required'],
      trim: true,
      index: true,
    },
    owner: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      index: true,
    },
    path: {
      type: String,
      required: [true, 'File path is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'File content is required'],
    },
    lang: {
      type: String,
      lowercase: true,
      trim: true,
    },
    lastIndexedSession: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexing Strategy ---

// 1. Compound index for extremely fast retrieval of files within a specific project
codeFileSchema.index({ owner: 1, repo: 1 });

// 2. Text Index for full-text search across content and file paths.
// We assign weights to prioritize path matches over content matches in search relevance.
codeFileSchema.index(
  { 
    path: 'text', 
    content: 'text' 
  }, 
  { 
    weights: { 
      path: 10, 
      content: 1 
    },
    name: 'CodeSearchIndex'
  }
);

const CodeFile = mongoose.model('CodeFile', codeFileSchema);

module.exports = CodeFile;
