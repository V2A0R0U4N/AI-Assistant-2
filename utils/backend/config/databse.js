/* Database Configuration - MongoDB Connection */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-assistant';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🔌 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err);
});

module.exports = connectDB;
