const mongoose = require('mongoose');

const industryCollaborationSchema = new mongoose.Schema({
  industryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Industry',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  supportOffered: {
    type: [String],
    default: []
  },
  contributionDetails: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Completed', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('IndustryCollaboration', industryCollaborationSchema);
