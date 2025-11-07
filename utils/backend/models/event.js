const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Event classification
  type: {
    type: String,
    enum: ['input', 'scroll', 'code_blocks', 'selection', 'deletion', 'paste', 'click', 'page_context', 'other'],
    required: true,
    index: true
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Event data (flexible - stores ANY event data)
  data: mongoose.Schema.Types.Mixed,
  
  // Context info
  platform: String,
  url: String,
  hostname: String,
  
  // Processing flags
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  analyzed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
eventSchema.index({ sessionId: 1, timestamp: -1 });
eventSchema.index({ sessionId: 1, type: 1 });
eventSchema.index({ type: 1, timestamp: -1 });
eventSchema.index({ platform: 1, timestamp: -1 });

// TTL index - auto-delete events after 30 days
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Event', eventSchema);
