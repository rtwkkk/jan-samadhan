const mongoose = require('mongoose');

const voiceCallSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String
  },
  userPhone: {
    type: String,
    required: true
  },
  sarvamLeadId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['initiated', 'completed', 'failed'],
    default: 'initiated'
  },
  callTranscript: {
    type: String
  },
  callSummary: {
    type: String
  },
  disposition: {
    type: String
  },
  recordingUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VoiceCall', voiceCallSchema);
