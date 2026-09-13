const mongoose = require('mongoose');

// ── Processing status constants ──
const PROCESSING_STATUSES = [
  'collecting',
  'collected',
  'ai_processing',
  'ready_for_complaint',
  'complaint_creating',
  'completed',
  'failed'
];

const jagritiComplaintDraftSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    index: true
  },

  // ── Voice-collected citizen fields ──
  citizenName: {
    type: String,
    trim: true
  },
  citizenEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  callDisposition: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  complaintType: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  villageBlock: {
    type: String,
    trim: true
  },
  peopleAffected: {
    type: Number,
    min: [1, 'At least 1 person must be affected']
  },

  // ── AI-generated fields (populated by backend, NOT by voice agent) ──
  aiGenerated: {
    title: { type: String },
    department: { type: String },
    priority: { type: String },
    confidence: { type: Number }
  },

  // ── Link to the real Challenge once created ──
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  },

  // ── Processing lifecycle ──
  processingStatus: {
    type: String,
    enum: PROCESSING_STATUSES,
    default: 'collecting'
  },
  processingError: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('JagritiComplaintDraft', jagritiComplaintDraftSchema);
module.exports.PROCESSING_STATUSES = PROCESSING_STATUSES;
