const express = require('express');
const router = express.Router();
const { submitSession, getSessionStatus } = require('../controllers/jagritiController');

// Submit structured voice-session data for complaint creation
router.post('/session', submitSession);

// Check the processing status of a Jagriti session
router.get('/session/:sessionId', getSessionStatus);

module.exports = router;
