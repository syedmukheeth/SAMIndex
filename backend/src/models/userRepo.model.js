const mongoose = require('mongoose');

const userRepoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  repositoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure a user doesn't have duplicate links to the same repo
userRepoSchema.index({ userId: 1, repositoryId: 1 }, { unique: true });

const UserRepo = mongoose.model('UserRepo', userRepoSchema);

module.exports = UserRepo;
