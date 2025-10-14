const express = require('express');
const router = express.Router();
const contextController = require('../controllers/contextController');

// Store single context
router.post('/context', contextController.storeContext);

// Store multiple contexts (batch)
router.post('/context/batch', contextController.storeContextBatch);

// Get context history
router.get('/context/history', contextController.getContextHistory);

// Get session summary
router.get('/context/session/:sessionId', contextController.getSessionSummary);

// Get statistics
router.get('/context/statistics', contextController.getStatistics);

// Cleanup old contexts
router.delete('/context/cleanup', contextController.cleanupOldContexts);

module.exports = router;
