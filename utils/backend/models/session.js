const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true,
    default: 'anonymous'
  },
  platform: {
    type: String,
    enum: ['GitHub', 'LeetCode', 'CodeSignal', 'HackerRank', 'Local IDE', 'Other'],
    default: 'Other',
    index: true
  },
  url: String,
  hostname: String,
  
  // Session timing
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: Date,
  duration: Number, // in seconds
  
  // Analytics
  totalEvents: {
    type: Number,
    default: 0
  },
  inputEvents: {
    type: Number,
    default: 0
  },
  scrollEvents: {
    type: Number,
    default: 0
  },
  codeBlocksCount: {
    type: Number,
    default: 0
  },
  
  // Behavior analysis
  patterns: [{
    type: String,
    enum: ['trial_and_error', 'idle_time', 'rapid_scroll', 'code_change', 'selection', 'deletion_heavy']
  }],
  
  // Struggle scoring
  struggleScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isStuck: {
    type: Boolean,
    default: false
  },
  
  // Content
  selectedTexts: [String],
  codeSnippets: [String],
  
  // Metadata
  metadata: {
    browser: String,
    userAgent: String,
    timezone: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    index: true
  },
  
  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ platform: 1, startTime: -1 });
sessionSchema.index({ struggleScore: -1 });
sessionSchema.index({ status: 1, startTime: -1 });

module.exports = mongoose.model('Session', sessionSchema);
