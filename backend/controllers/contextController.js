const Context = require('../models/contextModel');
const { v4: uuidv4 } = require('uuid');

// Store single context data
exports.storeContext = async (req, res) => {
    try {
        const contextData = req.body;

        // Generate session ID if not provided
        if (!contextData.sessionId) {
            contextData.sessionId = uuidv4();
        }

        // Extract domain from URL
        if (contextData.url && !contextData.domain) {
            try {
                const urlObj = new URL(contextData.url);
                contextData.domain = urlObj.hostname;
            } catch (e) {
                contextData.domain = 'unknown';
            }
        }

        const context = new Context(contextData);
        await context.save();

        console.log('Context stored:', context._id);

        res.status(201).json({
            success: true,
            message: 'Context stored successfully',
            contextId: context._id
        });
    } catch (error) {
        console.error('Error storing context:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Store multiple contexts (batch)
exports.storeContextBatch = async (req, res) => {
    try {
        const { contexts, sessionId } = req.body;

        if (!Array.isArray(contexts) || contexts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contexts array'
            });
        }

        // Use provided session ID or generate new one
        const batchSessionId = sessionId || contexts[0].sessionId || uuidv4();

        // Process each context
        const processedContexts = contexts.map(ctx => {
            ctx.sessionId = batchSessionId;

            // Extract domain if missing
            if (ctx.url && !ctx.domain) {
                try {
                    const urlObj = new URL(ctx.url);
                    ctx.domain = urlObj.hostname;
                } catch (e) {
                    ctx.domain = 'unknown';
                }
            }

            return ctx;
        });

        const result = await Context.insertMany(processedContexts);

        console.log(`Batch stored: ${result.length} contexts`);

        res.status(201).json({
            success: true,
            message: `${result.length} contexts stored successfully`,
            sessionId: batchSessionId,
            count: result.length
        });
    } catch (error) {
        console.error('Error storing context batch:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get context history
exports.getContextHistory = async (req, res) => {
    try {
        const { sessionId, userId, limit = 50, type } = req.query;

        const query = {};
        if (sessionId) query.sessionId = sessionId;
        if (userId) query.userId = userId;
        if (type) query.type = type;

        const contexts = await Context.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: contexts.length,
            contexts: contexts
        });
    } catch (error) {
        console.error('Error fetching context history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get session summary
exports.getSessionSummary = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const contexts = await Context.find({ sessionId })
            .sort({ timestamp: 1 });

        if (contexts.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Generate summary statistics
        const summary = {
            sessionId: sessionId,
            startTime: contexts[0].timestamp,
            endTime: contexts[contexts.length - 1].timestamp,
            duration: contexts[contexts.length - 1].timestamp - contexts[0].timestamp,
            totalContexts: contexts.length,
            types: {},
            domains: new Set(),
            urls: new Set(),
            platforms: new Set()
        };

        contexts.forEach(ctx => {
            summary.types[ctx.type] = (summary.types[ctx.type] || 0) + 1;
            summary.domains.add(ctx.domain);
            summary.urls.add(ctx.url);
            if (ctx.platform) summary.platforms.add(ctx.platform);
        });

        summary.domains = Array.from(summary.domains);
        summary.urls = Array.from(summary.urls);
        summary.platforms = Array.from(summary.platforms);

        res.status(200).json({
            success: true,
            summary: summary,
            contexts: contexts
        });
    } catch (error) {
        console.error('Error fetching session summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get statistics
exports.getStatistics = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const totalContexts = await Context.countDocuments({
            timestamp: { $gte: cutoffDate }
        });

        const typeBreakdown = await Context.aggregate([
            { $match: { timestamp: { $gte: cutoffDate } } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        const platformBreakdown = await Context.aggregate([
            { $match: { timestamp: { $gte: cutoffDate } } },
            { $group: { _id: '$platform', count: { $sum: 1 } } }
        ]);

        const topDomains = await Context.aggregate([
            { $match: { timestamp: { $gte: cutoffDate } } },
            { $group: { _id: '$domain', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            statistics: {
                totalContexts,
                typeBreakdown,
                platformBreakdown,
                topDomains,
                period: `Last ${days} days`
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete old contexts (cleanup)
exports.cleanupOldContexts = async (req, res) => {
    try {
        const daysToKeep = parseInt(req.query.days) || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await Context.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        console.log(`Cleanup: Deleted ${result.deletedCount} old contexts`);

        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} old contexts`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up contexts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
