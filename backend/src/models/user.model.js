const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    publicRepos: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
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
// 1. Text index for full-text search on username and bio
userSchema.index({ username: 'text', bio: 'text' });

// 2. Score index for ranking/sorting
userSchema.index({ score: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
