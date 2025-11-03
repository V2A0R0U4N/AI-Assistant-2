/* Event Model - Stores individual tracking events */
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
    enum: ['input', 'scroll', 'code_blocks', 'selection', 'deletion', 'paste', 'other'],
    required: true,
    index: true
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Event data (flexible)
  data: mongoose.Schema.Types.Mixed,
  
  // Context
  platform: String,
  url: String,
  hostname: String,
  
  // Detailed tracking for input events
  inputData: {
    eventType: String,
    element: String,
    value: String,
    valueLength: Number,
    inputType: String
  },
  
  // Detailed tracking for scroll events
  scrollData: {
    depth: Number,
    maxDepth: Number,
    scrollRate: Number,
    behavior: String,
    visibleElements: Array
  },
  
  // Detailed tracking for code blocks
  codeData: {
    language: String,
    content: String,
    lines: Number,
    characters: Number,
    location: String
  },
  
  // Selection data
  selectedText: String,
  textLength: Number,
  
  // Processing flags
  processed: {
    type: Boolean,
    default: false
  },
  analyzed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes
eventSchema.index({ sessionId: 1, timestamp: -1 });
eventSchema.index({ type: 1, timestamp: -1 });
eventSchema.index({ platform: 1, timestamp: -1 });

module.exports = mongoose.model('Event', eventSchema);
