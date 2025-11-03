// /* CodeFlow AI Backend Server - Phase 2 */
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const connectDB = require('./config/database');
// const trackingRoutes = require('./routes/trackingRoutes');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // ========================================
// // MIDDLEWARE
// // ========================================
// app.use(cors());
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// // ========================================
// // DATABASE CONNECTION
// // ========================================
// connectDB();

// // ========================================
// // ROUTES
// // ========================================
// app.use('/api/tracking', trackingRoutes);

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({ 
//     status: 'Server running', 
//     timestamp: new Date().toISOString(),
//     database: 'MongoDB ai-assistant'
//   });
// });

// // ========================================
// // ERROR HANDLING
// // ========================================
// app.use((err, req, res, next) => {
//   console.error('❌ Error:', err);
//   res.status(500).json({ 
//     error: 'Internal Server Error',
//     message: err.message 
//   });
// });

// // ========================================
// // SERVER START
// // ========================================
// app.listen(PORT, () => {
//   console.log(`\n🚀 CodeFlow AI Backend running on http://localhost:${PORT}`);
//   console.log(`📊 Tracking API: http://localhost:${PORT}/api/tracking\n`);
// });
