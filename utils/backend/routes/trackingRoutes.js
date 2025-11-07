const express = require('express');
const router = express.Router();
const Session = require('../models/session');
const Event = require('../models/event');

// ========================================
// SESSION ENDPOINTS
// ========================================

// Start session
router.post('/session/start', async (req, res) => {
    try {
        const { sessionId, userId, platform, url, hostname, startTime } = req.body;

        // Check if exists
        let session = await Session.findOne({ sessionId });
        if (session) {
            console.log('⚠️ Session exists:', sessionId);
            return res.json({ success: true, session, existed: true });
        }

        // Create new
        session = new Session({
            sessionId,
            userId: userId || 'anonymous',
            platform: platform || 'Other',
            url,
            hostname,
            startTime: startTime || new Date(),
            status: 'active'
        });

        await session.save();
        console.log('✅ Session created:', sessionId);

        res.status(201).json({ success: true, session });

    } catch (error) {
        console.error('❌ Session start error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update session
router.post('/session/update', async (req, res) => {
    try {
        const { sessionId, url, hostname, platform, timestamp } = req.body;

        const session = await Session.findOneAndUpdate(
            { sessionId },
            {
                $set: {
                    url,
                    hostname,
                    platform: platform || 'Other',
                    updatedAt: timestamp || new Date()
                }
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        console.log('🔄 Session updated:', sessionId);
        res.json({ success: true, session });

    } catch (error) {
        console.error('❌ Session update error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// End session
router.post('/session/end', async (req, res) => {
    try {
        const { sessionId, endTime, duration, totalEvents } = req.body;

        const session = await Session.findOneAndUpdate(
            { sessionId },
            {
                $set: {
                    status: 'completed',
                    endTime: endTime || new Date(),
                    duration: duration || 0,
                    totalEvents: totalEvents || session?.totalEvents || 0
                }
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        console.log('🏁 Session ended:', sessionId);
        res.json({ success: true, session });

    } catch (error) {
        console.error('❌ Session end error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// EVENT ENDPOINTS
// ========================================

// Save batch of events
router.post('/events/batch', async (req, res) => {
    try {
        const { sessionId, events } = req.body;

        if (!events || events.length === 0) {
            return res.json({ success: true, stored: 0 });
        }

        // Prepare events for bulk insert
        const eventDocuments = events.map(e => ({
            sessionId,
            type: e.type || 'other',
            data: e.data,
            timestamp: e.timestamp || new Date(),
            processed: false
        }));

        // Bulk insert
        const inserted = await Event.insertMany(eventDocuments);

        // Update session
        await Session.findOneAndUpdate(
            { sessionId },
            {
                $inc: { totalEvents: inserted.length },
                $set: { updatedAt: new Date() }
            }
        );

        console.log(`✅ Stored ${inserted.length} events for session ${sessionId}`);
        res.status(201).json({ success: true, stored: inserted.length });

    } catch (error) {
        console.error('❌ Event batch error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save single event
router.post('/event', async (req, res) => {
    try {
        const { sessionId, type, data, timestamp } = req.body;

        const event = new Event({
            sessionId,
            type: type || 'other',
            data,
            timestamp: timestamp || new Date(),
            processed: false
        });

        await event.save();

        // Update session
        await Session.findOneAndUpdate(
            { sessionId },
            {
                $inc: { totalEvents: 1 },
                $set: { updatedAt: new Date() }
            }
        );

        res.status(201).json({ success: true, eventId: event._id });

    } catch (error) {
        console.error('❌ Event save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get events for session
router.get('/events/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const events = await Event.find({ sessionId }).sort({ timestamp: 1 });

        res.json({ success: true, events, count: events.length });

    } catch (error) {
        console.error('❌ Events retrieval error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get session details
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({ success: true, session });

    } catch (error) {
        console.error('❌ Session retrieval error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
