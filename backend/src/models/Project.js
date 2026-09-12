const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  facultyMentor: {
    type: String,
    default: 'Unassigned'
  },
  status: {
    type: String,
    enum: ['Under Government Review', 'Active', 'Completed', 'On Hold'],
    default: 'Under Government Review'
  },
  progress: {
    type: Number,
    default: 0
  },
  budget: {
    type: String,
    default: 'Pending'
  },
  submittedOn: {
    type: Date,
    default: Date.now
  },
  nextMilestone: {
    type: String,
    default: 'Pending Setup'
  },
  lifecycle: [{
    name: String,
    completed: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
