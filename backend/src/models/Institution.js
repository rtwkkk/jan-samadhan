const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide institution name']
  },
  type: {
    type: String,
    enum: ['University', 'Engineering College', 'Medical College', 'Agricultural University / College', 'Polytechnic', 'Research Institute', 'Other Higher Education Institution'],
    required: [true, 'Please provide institution type']
  },
  aisheCode: {
    type: String,
    required: [true, 'Please provide AISHE code'],
    unique: true
  },
  district: {
    type: String,
    required: [true, 'Please provide a district']
  },
  emailDomain: {
    type: String,
    required: [true, 'Please provide official email domain']
  },
  departments: {
    type: [String],
    default: []
  },
  researchDomains: {
    type: [String],
    default: []
  },
  facilities: {
    type: Number,
    default: 0
  },
  similarProjectsCompleted: {
    type: Number,
    default: 0
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'institution'
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true });

const bcrypt = require('bcryptjs');

// Hash password before saving
institutionSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
institutionSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Institution', institutionSchema);
