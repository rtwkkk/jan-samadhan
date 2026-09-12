/**
 * WhatsApp Service
 *
 * Handles all communication with the Meta WhatsApp Cloud API.
 * Translated from the WhatsApp CRM's meta-api.ts and send-message.ts
 * into Jan Samadhan's Express.js / CommonJS architecture.
 */
const axios = require('axios');

const META_API_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

/**
 * Get configured WhatsApp credentials from environment.
 * @returns {{ accessToken: string, phoneNumberId: string }}
 */
function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('[WhatsApp] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment');
  }

  return { accessToken, phoneNumberId };
}

/**
 * Send a text message via WhatsApp Cloud API.
 * @param {string} to - Recipient phone number (E.164 format, e.g. "919876543210")
 * @param {string} text - Message text
 * @returns {Promise<{ messageId: string }>}
 */
async function sendTextMessage(to, text) {
  const { accessToken, phoneNumberId } = getConfig();
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text }
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });

    const messageId = response.data?.messages?.[0]?.id || '';
    console.log(`[WhatsApp] Text message sent to ${to}, messageId: ${messageId}`);
    return { messageId };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp] Failed to send text to ${to}:`, errMsg);
    throw new Error(`WhatsApp send failed: ${errMsg}`);
  }
}

/**
 * Send a media message via WhatsApp Cloud API.
 * @param {string} to - Recipient phone number
 * @param {'image'|'video'|'document'|'audio'} mediaType - Type of media
 * @param {string} mediaUrl - Public URL of the media file
 * @param {string} [caption] - Optional caption
 * @param {string} [filename] - Optional filename (for documents)
 * @returns {Promise<{ messageId: string }>}
 */
async function sendMediaMessage(to, mediaType, mediaUrl, caption, filename) {
  const { accessToken, phoneNumberId } = getConfig();
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  const mediaPayload = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename && mediaType === 'document') mediaPayload.filename = filename;

  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: mediaPayload
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });

    const messageId = response.data?.messages?.[0]?.id || '';
    console.log(`[WhatsApp] ${mediaType} sent to ${to}, messageId: ${messageId}`);
    return { messageId };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp] Failed to send ${mediaType} to ${to}:`, errMsg);
    throw new Error(`WhatsApp media send failed: ${errMsg}`);
  }
}

/**
 * Send an interactive button message.
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body
 * @param {Array<{id: string, title: string}>} buttons - Up to 3 buttons
 * @param {string} [headerText] - Optional header
 * @param {string} [footerText] - Optional footer
 * @returns {Promise<{ messageId: string }>}
 */
async function sendInteractiveButtons(to, bodyText, buttons, headerText, footerText) {
  const { accessToken, phoneNumberId } = getConfig();
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map(btn => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title.substring(0, 20) }
      }))
    }
  };

  if (headerText) interactive.header = { type: 'text', text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });

    const messageId = response.data?.messages?.[0]?.id || '';
    return { messageId };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp] Failed to send interactive to ${to}:`, errMsg);
    throw new Error(`WhatsApp interactive send failed: ${errMsg}`);
  }
}

/**
 * Resolve a Meta media ID to a download URL.
 * @param {string} mediaId - Meta media ID from webhook
 * @returns {Promise<{ url: string, mimeType: string, fileSize: number|null }>}
 */
async function getMediaUrl(mediaId) {
  const { accessToken } = getConfig();

  try {
    const response = await axios.get(`${META_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = response.data;
    if (!data.url) throw new Error('Media URL not found in Meta response');

    const size = Number(data.file_size);
    return {
      url: data.url,
      mimeType: data.mime_type || 'application/octet-stream',
      fileSize: Number.isFinite(size) && size >= 0 ? size : null
    };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[WhatsApp] Failed to resolve media ${mediaId}:`, errMsg);
    throw new Error(`Media resolution failed: ${errMsg}`);
  }
}

/**
 * Download media binary from Meta CDN.
 * @param {string} downloadUrl - URL from getMediaUrl
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function downloadMedia(downloadUrl) {
  const { accessToken } = getConfig();

  try {
    const response = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer'
    });

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  } catch (error) {
    console.error('[WhatsApp] Media download failed:', error.message);
    throw new Error(`Media download failed: ${error.message}`);
  }
}

/**
 * Mark a message as read on WhatsApp.
 * @param {string} messageId - The wa message ID to mark as read
 */
async function markAsRead(messageId) {
  const { accessToken, phoneNumberId } = getConfig();
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  try {
    await axios.post(url, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    // Non-critical — don't throw, just log
    console.warn('[WhatsApp] Failed to mark message as read:', error.message);
  }
}

module.exports = {
  sendTextMessage,
  sendMediaMessage,
  sendInteractiveButtons,
  getMediaUrl,
  downloadMedia,
  markAsRead,
  getConfig
};
