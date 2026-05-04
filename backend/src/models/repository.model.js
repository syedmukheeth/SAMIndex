const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Repository name is required'],
      trim: true,
    },
    owner: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    lang: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Repository URL is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    githubId: {
      type: Number,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// 1. Text index for searching across names and descriptions
repositorySchema.index({ name: 'text', description: 'text' });

// 2. Compound index for filtering by owner and name
repositorySchema.index({ owner: 1, name: 1 });

// 3. Sorting by stars (descending)
repositorySchema.index({ stars: -1 });

// 4. Filtering by language
repositorySchema.index({ lang: 1 });

const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;
