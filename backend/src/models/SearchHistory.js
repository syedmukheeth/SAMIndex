const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repo: {
    type: String,
    trim: true,
    index: true // Fast repo-wise lookups
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Fast temporal sorting
  }
}, {
  timestamps: true
});

// Compound Indexes for Performance
// 1. User's recent searches
searchHistorySchema.index({ userId: 1, timestamp: -1 });

// 2. Repository specific search trends
searchHistorySchema.index({ repo: 1, timestamp: -1 });

// 3. User search history for a specific repo
searchHistorySchema.index({ userId: 1, repo: 1, timestamp: -1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;
