const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  brandName: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  industryType: { type: String },
  location: { type: String },
  focusAreas: { type: [String], default: [] },
  organizationType: { type: String },
  industrySector: { type: String },
  primaryBusinessArea: { type: String },
  yearEstablished: { type: Number },
  headquarters: { type: String },
  website: { type: String },
  district: { type: String },
  state: { type: String, default: 'Jharkhand' },
  cin: { type: String },
  llpin: { type: String },
  gstin: { type: String },
  udyamNumber: { type: String },
  pan: { type: String },
  collaborationCapabilities: { type: [String], default: [] },
  expertiseAreas: { type: String },
  relevantProjects: { type: String },
  rndCapability: { type: String },
  geoAreas: { type: String },
  authRepName: { type: String },
  authRepDesignation: { type: String },
  authRepEmail: { type: String },
  authRepPhone: { type: String },
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
