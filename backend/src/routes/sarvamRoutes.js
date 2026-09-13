const express = require('express');
const router = express.Router();
const sarvamController = require('../controllers/sarvamController');

// Trigger an outbound call
router.post('/call', sarvamController.triggerCall);

// Webhook for Sarvam call status updates
router.post('/webhook', sarvamController.webhookHandler);

module.exports = router;
