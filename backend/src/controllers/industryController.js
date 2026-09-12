const Project = require('../models/Project');
const IndustryCollaboration = require('../models/IndustryCollaboration');
const Industry = require('../models/Industry');
const Challenge = require('../models/Challenge');

exports.getIndustryStats = async (req, res) => {
  try {
    const activeCollaborations = await IndustryCollaboration.countDocuments({ industryId: req.user._id, status: 'Active' });
    const csrDeployed = '₹ 0 L'; // Mock for now
    const pendingRequests = await IndustryCollaboration.countDocuments({ industryId: req.user._id, status: 'Pending' });
    const prototypesSupported = await IndustryCollaboration.countDocuments({ industryId: req.user._id, status: { $in: ['Active', 'Completed'] } });

    res.json({
      activeCollaborations,
      csrDeployed,
      pendingRequests,
      prototypesSupported
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOpenChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({ status: { $in: ['submitted', 'verified', 'assigned'] } });
    const result = challenges.map(c => ({
      id: c._id,
      title: c.title,
      domain: c.domain,
      urgency: c.urgencySeverity,
      location: c.district,
      type: 'Technical Solution'
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveCollaborations = async (req, res) => {
  try {
    const collabs = await IndustryCollaboration.find({ industryId: req.user._id, status: 'Active' })
      .populate('projectId')
      .populate('institutionId');
      
    const result = collabs.map(c => ({
      id: c._id,
      challengeId: c.projectId ? c.projectId.challengeId : '',
      title: c.projectId ? c.projectId.title : 'Unknown',
      partner: c.institutionId ? c.institutionId.name : 'Unknown',
      contribution: c.contributionDetails || 'Financial / Mentorship',
      status: 'Active',
      progress: c.projectId ? c.projectId.progress : 0
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCSRRequests = async (req, res) => {
  try {
    const collabs = await IndustryCollaboration.find({ industryId: req.user._id, status: 'Pending' })
      .populate('projectId')
      .populate('institutionId');
      
    const result = collabs.map(c => ({
      id: c._id,
      title: c.projectId ? c.projectId.title : 'Unknown',
      institution: c.institutionId ? c.institutionId.name : 'Unknown',
      requestedAmount: '₹ 5.0 Lakhs', // Mock
      status: 'Pending'
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIndustryProfile = async (req, res) => {
  try {
    const ind = await Industry.findById(req.user._id);
    if (!ind) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      name: ind.companyName,
      sector: ind.industrySector,
      location: 'Jharkhand',
      focusAreas: ['Agriculture', 'Water Resources']
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  res.json([]);
};
