const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ========================================
// SCHEMAS
// ========================================

// Session Schema
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  platform: String,
  url: String,
  hostname: String,
  userId: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  totalEvents: { type: Number, default: 0 },
  totalContexts: { type: Number, default: 0 }
});

// Event Schema
const eventSchema = new mongoose.Schema({
  sessionId: String,
  type: String,
  data: mongoose.Schema.Types.Mixed,
  platform: String,
  url: String,
  hostname: String,
  timestamp: { type: Date, default: Date.now }
});

const Session = mongoose.model('sessions', sessionSchema);
const Event = mongoose.model('events', eventSchema);

// ========================================
// ENDPOINTS
// ========================================

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'Tracking API running',
    timestamp: new Date().toISOString()
  });
});

// Create session
router.post('/session/create', async (req, res) => {
  try {
    const { sessionId, platform, url, hostname, userId } = req.body;
    
    console.log('✅ Creating session:', sessionId);
    
    const session = new Session({
      sessionId,
      platform,
      url,
      hostname,
      userId,
      startTime: new Date()
    });
    
    await session.save();
    
    res.json({
      success: true,
      message: 'Session created',
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Store events
router.post('/events', async (req, res) => {
  try {
    const { sessionId, events, platform, url, hostname, timestamp } = req.body;
    
    console.log(`📤 Receiving ${events.length} events for session:`, sessionId);
    
    // Insert all events
    const insertedEvents = await Event.insertMany(
      events.map(event => ({
        sessionId,
        type: event.type,
        data: event.data || event,
        platform,
        url,
        hostname,
        timestamp: event.timestamp || timestamp || new Date()
      }))
    );
    
    // Update session stats
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        $inc: { 
          totalEvents: events.length,
          totalContexts: events.filter(e => e.type === 'context' || e.type === 'page_context').length
        }
      },
      { new: true }
    );
    
    console.log(`✅ Stored ${insertedEvents.length} events`);
    
    res.json({
      success: true,
      message: 'Events stored',
      eventsStored: insertedEvents.length,
      sessionStats: {
        sessionId,
        eventsCount: insertedEvents.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error storing events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// End session
router.post('/session/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('⏹️ Ending session:', sessionId);
    
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { 
        status: 'ended',
        endTime: new Date()
      },
      { new: true }
    );
    
    const eventsCount = await Event.countDocuments({ sessionId });
    
    res.json({
      success: true,
      message: 'Session ended',
      session: {
        sessionId,
        status: session.status,
        totalEvents: eventsCount,
        duration: session.endTime - session.startTime
      }
    });
    
  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session data
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    const events = await Event.find({ sessionId }).limit(100);
    
    res.json({
      success: true,
      session,
      events,
      eventCount: events.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ startTime: -1 }).limit(20);
    
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments();
    const activeSessions = await Session.countDocuments({ status: 'active' });
    const totalEvents = await Event.countDocuments();
    
    res.json({
      success: true,
      stats: {
        totalSessions,
        activeSessions,
        totalEvents
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
