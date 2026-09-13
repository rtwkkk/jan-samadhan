/**
 * WhatsApp Routes
 *
 * Webhook routes for Meta WhatsApp Cloud API integration.
 * No auth middleware — Meta webhooks use verify token for verification.
 */
const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/whatsappController');

// @route   GET /api/whatsapp/webhook
// @desc    Meta webhook verification handshake
// @access  Public
router.get('/webhook', verifyWebhook);

// @route   POST /api/whatsapp/webhook
// @desc    Receive incoming WhatsApp messages and status updates
// @access  Public (Meta sends events here)
router.post('/webhook', handleWebhook);

module.exports = router;
