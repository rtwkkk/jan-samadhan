const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'interactive', 'template', 'sticker', 'reaction'],
    default: 'text'
  },
  mediaUrl: {
    type: String
  },
  mediaType: {
    type: String
  },
  waMessageId: {
    type: String
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'received'],
    default: 'received'
  },
  // Link to a challenge if this message resulted in complaint creation
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }
}, { timestamps: true });

// Index for fetching conversation history efficiently
whatsAppMessageSchema.index({ phone: 1, createdAt: -1 });

// Prevent duplicate message processing using Meta's message ID
whatsAppMessageSchema.index({ waMessageId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
