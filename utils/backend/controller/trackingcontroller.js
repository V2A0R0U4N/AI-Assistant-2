/* Tracking Controller - Business Logic & Pattern Detection */
const Session = require('../models/Session');
const Event = require('../models/Event');

// ========================================
// SESSION CONTROLLER
// ========================================

exports.createSession = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      platform,
      url,
      hostname
    } = req.body;

    // Check if session already exists
    let session = await Session.findOne({ sessionId });
    if (session) {
      return res.status(400).json({ error: 'Session already exists' });
    }

    // Create new session
    session = new Session({
      sessionId,
      userId,
      platform,
      url,
      hostname,
      startTime: new Date(),
      status: 'active'
    });

    await session.save();

    console.log(`✅ Session Created: ${sessionId} (${platform})`);

    res.json({
      success: true,
      session: session,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSessionData = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId })
      .populate('events');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session: session,
      eventCount: session.events.length
    });

  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.round((endTime - session.startTime) / 1000); // in seconds

    session.endTime = endTime;
    session.duration = duration;
    session.status = 'completed';

    await session.save();

    console.log(`✅ Session Ended: ${sessionId} (Duration: ${duration}s)`);

    res.json({
      success: true,
      session: session,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// EVENTS CONTROLLER
// ========================================

exports.storeEvents = async (req, res) => {
  try {
    const {
      sessionId,
      events,
      platform,
      url,
      hostname
    } = req.body;

    if (!sessionId || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Get or create session if needed
    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = await Session.create({
        sessionId,
        platform,
        url,
        hostname,
        startTime: new Date(),
        status: 'active'
      });
    }

    // Process and store events
    const storedEvents = [];
    let inputCount = 0;
    let scrollCount = 0;
    let codeCount = 0;

    for (const eventData of events) {
      try {
        const event = new Event({
          sessionId,
          type: eventData.type,
          timestamp: eventData.timestamp || new Date(),
          data: eventData.data || eventData,
          platform,
          url,
          hostname,
          processed: false
        });

        // Categorize events
        if (eventData.type === 'input' || eventData.type === 'typing') {
          event.inputData = eventData.data;
          inputCount++;
        } else if (eventData.type === 'scroll') {
          event.scrollData = eventData.data;
          scrollCount++;
        } else if (eventData.type === 'code_blocks') {
          event.codeData = eventData.data;
          codeCount++;
        } else if (eventData.type === 'selection') {
          event.selectedText = eventData.data?.text;
          event.textLength = eventData.data?.text?.length || 0;
        }

        await event.save();
        storedEvents.push(event._id);
      } catch (err) {
        console.warn(`⚠️ Error storing single event:`, err.message);
      }
    }

    // Update session statistics
    session.events.push(...storedEvents);
    session.totalEvents += events.length;
    session.inputEvents += inputCount;
    session.scrollEvents += scrollCount;
    session.codeBlocksCount += codeCount;

    // Detect patterns and calculate struggle score
    await exports.analyzePatterns(session, events);

    await session.save();

    console.log(`✅ Events Stored: ${events.length} events for session ${sessionId}`);

    res.json({
      success: true,
      eventsStored: storedEvents.length,
      sessionStats: {
        totalEvents: session.totalEvents,
        inputEvents: session.inputEvents,
        scrollEvents: session.scrollEvents,
        codeBlocks: session.codeBlocksCount,
        struggleScore: session.struggleScore
      }
    });

  } catch (error) {
    console.error('❌ Error storing events:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSessionEvents = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = req.query.limit || 50;

    const events = await Event.find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      sessionId,
      eventCount: events.length,
      events: events
    });

  } catch (error) {
    console.error('❌ Error fetching events:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// PATTERN DETECTION & ANALYSIS
// ========================================

exports.analyzePatterns = async (session, events) => {
  try {
    const patterns = [];
    let struggleScore = 0;

    // Pattern 1: Trial & Error Detection
    const deletionEvents = events.filter(e => 
      e.type === 'input' || e.type === 'deletion' || e.data?.eventType === 'keypress'
    );
    if (deletionEvents.length > events.length * 0.3) {
      patterns.push('trial_and_error');
      struggleScore += 25;
      console.log('🔴 Pattern Detected: Trial & Error');
    }

    // Pattern 2: Idle Time (Long gaps between events)
    if (events.length > 1) {
      let maxGap = 0;
      for (let i = 1; i < events.length; i++) {
        const gap = new Date(events[i].timestamp) - new Date(events[i - 1].timestamp);
        maxGap = Math.max(maxGap, gap);
      }
      if (maxGap > 180000) { // 3+ minutes gap
        patterns.push('idle_time');
        struggleScore += 30;
        console.log('🔴 Pattern Detected: Idle Time (3+ minutes)');
      }
    }

    // Pattern 3: Rapid Scrolling (Searching for help)
    const scrollEvents = events.filter(e => e.type === 'scroll');
    if (scrollEvents.length > 10) {
      const rapidScrolls = scrollEvents.filter(e => 
        e.data?.scrollRate > 1000
      );
      if (rapidScrolls.length > scrollEvents.length * 0.5) {
        patterns.push('rapid_scroll');
        struggleScore += 20;
        console.log('🔴 Pattern Detected: Rapid Scrolling');
      }
    }

    // Pattern 4: Selection of Help Text (Copying from hints/docs)
    const selections = events.filter(e => e.type === 'selection');
    if (selections.length > 5) {
      patterns.push('selection');
      struggleScore += 15;
      console.log('🔴 Pattern Detected: Multiple Text Selections');
    }

    // Pattern 5: Heavy Deletion (Delete-heavy behavior)
    const deletionHeavy = events.filter(e => 
      e.data?.key === 'Delete' || e.data?.key === 'Backspace'
    );
    if (deletionHeavy.length > events.length * 0.2) {
      patterns.push('deletion_heavy');
      struggleScore += 20;
      console.log('🔴 Pattern Detected: Heavy Deletion');
    }

    // Code change frequency
    const codeBlockEvents = events.filter(e => e.type === 'code_blocks');
    if (codeBlockEvents.length > 5) {
      patterns.push('code_change');
      struggleScore += 15;
      console.log('🔴 Pattern Detected: Frequent Code Changes');
    }

    // Update session with findings
    session.patterns = [...new Set(patterns)];
    session.struggleScore = Math.min(100, struggleScore);
    session.isStuck = session.struggleScore > 70;

    if (session.isStuck) {
      console.log(`⚠️ USER STUCK - Struggle Score: ${session.struggleScore}/100`);
    }

  } catch (error) {
    console.error('❌ Error analyzing patterns:', error);
  }
};

// ========================================
// ANALYSIS ENDPOINTS
// ========================================

exports.getPatterns = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      sessionId,
      patterns: session.patterns,
      struggleScore: session.struggleScore,
      isStuck: session.isStuck
    });

  } catch (error) {
    console.error('❌ Error fetching patterns:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getStruggleScore = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      sessionId,
      struggleScore: session.struggleScore,
      isStuck: session.isStuck,
      recommendation: session.struggleScore > 70 ? 'User needs help' : 'User doing fine'
    });

  } catch (error) {
    console.error('❌ Error fetching struggle score:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getFullAnalysis = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findOne({ sessionId })
      .populate('events');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const duration = session.endTime 
      ? Math.round((session.endTime - session.startTime) / 1000)
      : Math.round((new Date() - session.startTime) / 1000);

    res.json({
      success: true,
      analysis: {
        sessionId,
        platform: session.platform,
        duration: duration,
        status: session.status,
        patterns: session.patterns,
        struggleScore: session.struggleScore,
        isStuck: session.isStuck,
        statistics: {
          totalEvents: session.totalEvents,
          inputEvents: session.inputEvents,
          scrollEvents: session.scrollEvents,
          codeBlocks: session.codeBlocksCount
        },
        recommendation: session.struggleScore > 70 
          ? '🔴 HIGH STRUGGLE - Proactive help needed'
          : session.struggleScore > 40
          ? '🟡 MEDIUM STRUGGLE - Monitor and help if needed'
          : '🟢 LOW STRUGGLE - User doing well'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching full analysis:', error);
    res.status(500).json({ error: error.message });
  }
};
