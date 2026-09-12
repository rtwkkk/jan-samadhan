const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    maxlength: [120, 'Title cannot be more than 120 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  callSummary: {
    type: String
  },
  category: {
    type: String,
    default: 'Other'
  },
  department: {
    type: String,
    default: 'Other'
  },
  urgencySeverity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical', 'Unverified'],
    default: 'Unverified'
  },
  district: {
    type: String,
    required: [true, 'Please provide a district']
  },
  villageCityBlock: {
    type: String,
    required: [true, 'Please provide a village, city, or block']
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  peopleAffected: {
    type: Number,
    required: [true, 'Please provide number of people affected'],
    min: [1, 'At least 1 person must be affected']
  },
  supportingDocuments: {
    type: [String],
    default: []
  },
  fullName: {
    type: String,
    required: [true, 'Please provide full name']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please provide a mobile number'],
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  consent: {
    type: Boolean,
    required: [true, 'Consent is required to submit a challenge'],
    validate: {
      validator: function (v) { return v === true; },
      message: 'You must consent to sharing contact details.'
    }
  },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'information_requested', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'],
    default: 'submitted'
  },
  aiAnalysisStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  aiConfidence: {
    type: Number
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  rejectionReason: {
    type: String
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectedAt: {
    type: Date
  },
  informationRequest: {
    message: String,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    requestedAt: Date
  },
  additionalInformation: {
    message: String,
    attachments: [String],
    submittedAt: Date,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assignment: {
    institution_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
    institution_name: String,
    department: String,
    professor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    professor_name: String,
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    assigned_at: Date
  },
  statusHistory: [{
    from: String,
    to: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    changedByRole: String,
    reason: String,
    changedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Add indexes for searching/filtering
challengeSchema.index({ district: 1, status: 1 });
challengeSchema.index({ category: 1 });
challengeSchema.index({ urgencySeverity: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
