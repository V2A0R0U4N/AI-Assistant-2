const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const contextRoutes = require('./routes/contextRoutes');

const app = express();

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// MONGODB CONNECTION
// ========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-assistant';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        console.log('📊 Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// MongoDB connection event handlers
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB Reconnected');
});

// ========================================
// ROUTES
// ========================================
app.use('/api', contextRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AI Assistant Backend API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            context: '/api/context',
            contextBatch: '/api/context/batch',
            contextHistory: '/api/context/history',
            sessionSummary: '/api/context/session/:sessionId',
            statistics: '/api/context/statistics',
            cleanup: '/api/context/cleanup'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ========================================
// SERVER STARTUP
// ========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ==========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
    console.log('🚀 ==========================================');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

module.exports = app;
