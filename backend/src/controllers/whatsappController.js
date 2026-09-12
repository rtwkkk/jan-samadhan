/**
 * WhatsApp Controller
 *
 * Handles Meta WhatsApp Cloud API webhooks.
 * Translated from the CRM's webhook/route.ts into Jan Samadhan's Express.js architecture.
 *
 * Two endpoints:
 *   GET  /api/whatsapp/webhook — Meta verification handshake
 *   POST /api/whatsapp/webhook — Incoming messages, status updates, media
 */
const crypto = require('crypto');
const conversationService = require('../services/whatsapp/whatsappConversation.service');
const WhatsAppMessage = require('../models/WhatsAppMessage');

/**
 * @desc    Verify webhook with Meta
 * @route   GET /api/whatsapp/webhook
 * @access  Public (Meta verification)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN not configured');
    return res.sendStatus(403);
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook] Verification successful');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verification failed — token mismatch');
  return res.sendStatus(403);
};

/**
 * @desc    Handle incoming WhatsApp webhook events
 * @route   POST /api/whatsapp/webhook
 * @access  Public (Meta sends events here)
 */
const handleWebhook = async (req, res) => {
  try {
    // ── 1. Verify Webhook Signature (Security) ──
    const appSecret = process.env.META_APP_SECRET;
    const signature = req.headers['x-hub-signature-256'];
    
    if (appSecret && signature && req.rawBody) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret)
        .update(req.rawBody)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.warn('[WhatsApp Webhook] Invalid signature detected. Possible tampering.');
        return res.status(401).send('Invalid signature');
      }
    }

    // Immediately respond 200 to Meta — they retry on non-200
    res.sendStatus(200);

    const body = req.body;
    const baseUrl = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');

    // Validate it's a WhatsApp webhook
    if (body?.object !== 'whatsapp_business_account') {
      console.warn('[WhatsApp Webhook] Non-WhatsApp event received:', body?.object);
      return;
    }

    console.log('[WhatsApp Webhook] Received event:', JSON.stringify(body, null, 2));

    // Process each entry
    const entries = body.entry || [];
    const expectedWabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    for (const entry of entries) {
      // Validate Business Account ID if configured
      if (expectedWabaId && entry.id !== expectedWabaId) {
        console.warn(`[WhatsApp Webhook] Event ignored. WABA ID mismatch: received '${entry.id}', expected '${expectedWabaId}'`);
        continue;
      }

      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        // ── Handle message status updates ──
        const statuses = value.statuses || [];
        for (const status of statuses) {
          await handleStatusUpdate(status);
        }

        // ── Handle incoming messages ──
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const message of messages) {
          const senderPhone = message.from;
          const contactName = contacts.find(c => c.wa_id === senderPhone)?.profile?.name || '';
          const waMessageId = message.id;

          console.log(`[WhatsApp Webhook] Message from ${senderPhone} (${contactName}): type=${message.type}`);

          switch (message.type) {
            case 'text':
              await conversationService.handleIncomingMessage(
                senderPhone,
                message.text?.body || '',
                waMessageId,
                baseUrl
              );
              break;

            case 'image':
              await conversationService.handleIncomingMedia(senderPhone, {
                id: message.image?.id,
                mimeType: message.image?.mime_type,
                caption: message.image?.caption || '',
                type: 'image'
              }, waMessageId);
              break;

            case 'video':
              await conversationService.handleIncomingMedia(senderPhone, {
                id: message.video?.id,
                mimeType: message.video?.mime_type,
                caption: message.video?.caption || '',
                type: 'video'
              }, waMessageId);
              break;

            case 'document':
              await conversationService.handleIncomingMedia(senderPhone, {
                id: message.document?.id,
                mimeType: message.document?.mime_type,
                caption: message.document?.caption || message.document?.filename || '',
                type: 'document'
              }, waMessageId);
              break;

            case 'audio':
              await conversationService.handleIncomingMedia(senderPhone, {
                id: message.audio?.id,
                mimeType: message.audio?.mime_type,
                caption: '',
                type: 'audio'
              }, waMessageId);
              break;

            case 'location':
              if (message.location) {
                const loc = message.location;
                const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
                  .filter(Boolean)
                  .join(' - ');
                await conversationService.handleIncomingMessage(
                  senderPhone,
                  `📍 Location: ${locationText}`,
                  waMessageId
                );
              }
              break;

            case 'interactive': {
              // Button or list reply
              const reply = message.interactive?.button_reply || message.interactive?.list_reply;
              const replyText = reply?.title || reply?.id || '[Interactive reply]';
              await conversationService.handleIncomingMessage(
                senderPhone,
                replyText,
                waMessageId
              );
              break;
            }

            case 'button': {
              // Template quick-reply button tap
              const buttonText = message.button?.text || message.button?.payload || '[Button reply]';
              await conversationService.handleIncomingMessage(
                senderPhone,
                buttonText,
                waMessageId
              );
              break;
            }

            case 'reaction':
              // Ignore reactions — they don't need a response
              console.log(`[WhatsApp Webhook] Reaction from ${senderPhone}: ${message.reaction?.emoji}`);
              break;

            default:
              console.log(`[WhatsApp Webhook] Unsupported message type: ${message.type} from ${senderPhone}`);
              // Try to respond with a helpful message
              await conversationService.handleIncomingMessage(
                senderPhone,
                `[Unsupported: ${message.type}]`,
                waMessageId
              );
              break;
          }
        }
      }
    }
  } catch (err) {
    // Never crash the webhook handler — Meta will keep retrying
    console.error('[WhatsApp Webhook] Unhandled error:', err);
  }
};

/**
 * Handle message delivery/read status updates.
 * @param {object} status - { id, status, timestamp, recipient_id }
 */
async function handleStatusUpdate(status) {
  try {
    const { id: waMessageId, status: newStatus } = status;
    if (!waMessageId || !newStatus) return;

    // Map Meta statuses to our enum
    const statusMap = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed'
    };

    const mappedStatus = statusMap[newStatus];
    if (!mappedStatus) return;

    // Update the stored message status
    await WhatsAppMessage.findOneAndUpdate(
      { waMessageId },
      { $set: { status: mappedStatus } }
    );
  } catch (err) {
    // Non-critical — just log
    console.warn('[WhatsApp Webhook] Status update error:', err.message);
  }
}

module.exports = {
  verifyWebhook,
  handleWebhook
};
