const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  industryType: {
    type: String,
  },
  collaborationStatus: {
    type: String,
    enum: ['Active', 'Pending', 'Completed'],
    default: 'Active'
  },
  associatedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'industry'
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true });

const bcrypt = require('bcryptjs');

// Hash password before saving
industrySchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
industrySchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Industry', industrySchema);
