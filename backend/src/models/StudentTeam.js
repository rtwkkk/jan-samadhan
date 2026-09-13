const mongoose = require('mongoose');

const studentTeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  facultyMentor: {
    type: String,
    required: true
  },
  students: {
    type: [String],
    required: true
  },
  departments: {
    type: [String],
    default: []
  },
  skills: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Completed'],
    default: 'Active'
  }
}, { timestamps: true });

module.exports = mongoose.model('StudentTeam', studentTeamSchema);
