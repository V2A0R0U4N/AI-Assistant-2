const mongoose = require('mongoose');

const contextSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: false,
        default: 'anonymous'
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['page_context', 'selection', 'code_context', 'summary', 'code_detection', 'activity'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    selectedText: {
        type: String,
        required: false
    },
    keywords: {
        type: [String],
        required: false
    },
    summary: {
        type: String,
        required: false
    },
    platform: {
        type: String,
        required: false,
        default: 'web'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'contexts'
});

// TTL index - auto-delete after 7 days
contextSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Compound indexes for efficient queries
contextSchema.index({ sessionId: 1, timestamp: -1 });
contextSchema.index({ userId: 1, timestamp: -1 });
contextSchema.index({ domain: 1, timestamp: -1 });
contextSchema.index({ type: 1, timestamp: -1 });

const Context = mongoose.model('Context', contextSchema);

module.exports = Context;
