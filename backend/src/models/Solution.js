const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  solutionStatement: {
    type: String,
    required: true
  },
  solutionDescription: {
    type: String,
    required: true
  },
  teamComposition: {
    numberOfMembers: {
      type: Number,
      required: true
    },
    details: String
  },
  collegeDepartment: {
    type: String,
    required: true
  },
  expectedCompletionTime: {
    type: String
  },
  status: {
    type: String,
    enum: ['Proposed', 'In Progress', 'Completed', 'Rejected'],
    default: 'Proposed'
  }
}, { timestamps: true });

module.exports = mongoose.model('Solution', solutionSchema);
