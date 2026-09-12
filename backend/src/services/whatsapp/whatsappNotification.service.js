/**
 * WhatsApp Notification Service
 *
 * Sends WhatsApp status notifications when a complaint's status changes.
 * Called from adminController when updating challenge status.
 * Uses the existing whatsappService for sending messages.
 */
const whatsappService = require('../whatsappService');
const WhatsAppMessage = require('../../models/WhatsAppMessage');

// Status messages in citizen-friendly Hindi/Hinglish
const STATUS_MESSAGES = {
  under_review: (title, id) =>
    `🔍 Aapki complaint *"${title}"* ab review mein hai.\n\nComplaint ID: ${id}`,

  verified: (title, id) =>
    `✅ Aapki complaint *"${title}"* verified ho gayi hai aur jald hi kisi university ko assign ki jayegi.\n\nComplaint ID: ${id}`,

  assigned: (title, id, institutionName) =>
    `🏛️ Aapki complaint *"${title}"* ko *${institutionName || 'ek university'}* ko assign kiya gaya hai. Ve iske solution par kaam karenge.\n\nComplaint ID: ${id}`,

  in_progress: (title, id) =>
    `🚧 Aapki complaint *"${title}"* par kaam shuru ho gaya hai!\n\nComplaint ID: ${id}`,

  resolved: (title, id) =>
    `🎉 Badhaai ho! Aapki complaint *"${title}"* successfully resolve ho gayi hai.\n\nComplaint ID: ${id}\n\nJan Samadhan ko use karne ke liye dhanyavaad! 🙏`,

  rejected: (title, id, reason) =>
    `❌ Aapki complaint *"${title}"* reject ho gayi hai.\n\nReason: ${reason || 'Not specified'}\n\nComplaint ID: ${id}\n\nNayi complaint ke liye 'hi' bhejein.`,

  information_requested: (title, id, message) =>
    `❓ Aapki complaint *"${title}"* ke liye aur information chahiye.\n\n${message || ''}\n\nComplaint ID: ${id}\n\nKripya web portal par jaake additional information submit karein.`
};

/**
 * Send a WhatsApp notification for a status change.
 * Silently fails — notification failure must NOT affect the main status update.
 *
 * @param {object} challenge - The Challenge document
 * @param {string} newStatus - The new status
 * @param {object} [extra] - Optional extra info (institutionName, reason, message)
 */
async function sendStatusNotification(challenge, newStatus, extra = {}) {
  try {
    // Only send if the complaint originated from WhatsApp
    if (challenge.source !== 'WHATSAPP' || !challenge.whatsappPhone) {
      return;
    }

    const phone = challenge.whatsappPhone;
    const title = challenge.title || 'Complaint';
    const id = challenge._id.toString();

    const messageBuilder = STATUS_MESSAGES[newStatus];
    if (!messageBuilder) {
      console.log(`[WhatsApp Notif] No notification template for status: ${newStatus}`);
      return;
    }

    let notifText;
    if (newStatus === 'assigned') {
      notifText = messageBuilder(title, id, extra.institutionName);
    } else if (newStatus === 'rejected') {
      notifText = messageBuilder(title, id, extra.reason);
    } else if (newStatus === 'information_requested') {
      notifText = messageBuilder(title, id, extra.message);
    } else {
      notifText = messageBuilder(title, id);
    }

    const { messageId } = await whatsappService.sendTextMessage(phone, notifText);

    // Log the outbound notification message
    await WhatsAppMessage.create({
      phone,
      direction: 'outbound',
      content: notifText,
      messageType: 'text',
      waMessageId: messageId || undefined,
      status: 'sent',
      challengeId: challenge._id
    });

    console.log(`[WhatsApp Notif] Status notification sent to ${phone} for challenge ${id}: ${newStatus}`);
  } catch (err) {
    // Never throw — notification failure is non-critical
    console.error('[WhatsApp Notif] Failed to send notification:', err.message);
  }
}

module.exports = {
  sendStatusNotification
};
