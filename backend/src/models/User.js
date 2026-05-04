const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication Fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true, // Allows multiple null values for guest/github users
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    minlength: 8,
    select: false
  },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User&background=random'
  },
  provider: {
    type: String,
    enum: ['google', 'github', 'email', 'guest'],
    default: 'email'
  },
  googleId: {
    type: String,
    select: false,
    sparse: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // GitHub / Intelligence Analytics Fields
  username: {
    type: String,
    trim: true,
    sparse: true, // Only for GitHub synced users
    unique: true
  },
  bio: {
    type: String,
    trim: true
  },
  followers: {
    type: Number,
    default: 0
  },
  following: {
    type: Number,
    default: 0
  },
  publicRepos: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  githubId: {
    type: String, // Keep as string for flexibility, or Number if strict
    sparse: true,
    unique: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for Search/Performance
userSchema.index({ username: 'text', name: 'text', bio: 'text' });
userSchema.index({ score: -1 });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
