const Challenge = require('../models/Challenge');
const Institution = require('../models/Institution');
const Notification = require('../models/Notification');
const { canTransition } = require('../utils/statusTransition');
const whatsappNotification = require('../services/whatsapp/whatsappNotification.service');

// Helper for formatting time elapsed
const timeSince = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// @desc    Get dashboard KPIs
// @route   GET /api/admin/kpis
// @access  Private/Admin
const getKPIs = async (req, res) => {
  try {
    const total = await Challenge.countDocuments();
    const pending = await Challenge.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
    const highPriority = await Challenge.countDocuments({ urgencySeverity: { $in: ['High', 'Critical'] } });
    const verified = await Challenge.countDocuments({ status: 'verified' });
    const assigned = await Challenge.countDocuments({ status: 'assigned' });
    const active = await Challenge.countDocuments({ status: 'in_progress' });
    const resolved = await Challenge.countDocuments({ status: 'resolved' });

    res.json([
      { label: 'Total Challenges', value: total.toString() },
      { label: 'Pending Review', value: pending.toString() },
      { label: 'High Priority', value: highPriority.toString() },
      { label: 'Verified', value: verified.toString() },
      { label: 'Assigned', value: assigned.toString() },
      { label: 'Active Projects', value: active.toString() },
      { label: 'Resolved', value: resolved.toString() }
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Review Queue
// @route   GET /api/admin/queue
// @access  Private/Admin
const getReviewQueue = async (req, res) => {
  try {
    const challenges = await Challenge.find({ status: { $in: ['submitted', 'under_review'] } }).sort({ createdAt: -1 });

    const formatted = challenges.map(c => ({
      id: c._id,
      title: c.title,
      domain: c.category,
      district: c.district,
      priority: c.urgencySeverity,
      evidence: c.supportingDocuments.length > 0 ? 'Strong' : 'None',
      aiScore: (c.aiConfidence || Math.floor(Math.random() * 20 + 80)) + '%',
      status: c.status === 'submitted' ? 'Info Received' : 'Pending Review',
      time: timeSince(c.createdAt),
      description: c.description,
      callSummary: c.callSummary, // Explicitly pass callSummary down to frontend
      peopleAffected: c.peopleAffected
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get matches for a challenge
// @route   GET /api/admin/match/:id
// @access  Private/Admin
const getMatches = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // Fetch real institutions
    const institutions = await Institution.find();
    const mockMatches = institutions.map(inst => ({
      id: inst._id,
      name: inst.name,
      match: Math.floor(Math.random() * 20 + 80), // Mock score
      distance: Math.floor(Math.random() * 100 + 10) + ' km',
      depts: inst.departments.join(', ') || 'Various',
      facilities: inst.facilities || Math.floor(Math.random() * 5 + 1),
      similar: inst.similarProjectsCompleted || Math.floor(Math.random() * 10)
    })).sort((a, b) => b.match - a.match);

    res.json(mockMatches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign an institution to a challenge
// @route   PUT /api/admin/challenges/:id/assign
// @access  Private/Admin
const assignChallenge = async (req, res) => {
  try {
    const { institutionId } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (!canTransition(challenge.status, 'assigned')) {
      return res.status(400).json({ message: `Cannot transition from ${challenge.status} to assigned` });
    }

    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    challenge.statusHistory.push({
      from: challenge.status,
      to: 'assigned',
      changedBy: req.user._id,
      changedByRole: req.user.role,
      reason: 'Challenge assigned to institution',
      changedAt: new Date()
    });

    challenge.status = 'assigned';
    challenge.institution = institutionId;
    challenge.assignment = {
      institution_id: institution._id,
      institution_name: institution.name,
      department: institution.departments && institution.departments.length > 0 ? institution.departments[0] : 'Various',
      assigned_by: req.user._id,
      assigned_at: new Date()
    };

    await challenge.save();

    // Create notification for the user
    try {
      if (challenge.user) {
        await Notification.create({
          recipient: challenge.user,
          type: 'assigned',
          title: 'Challenge Assigned',
          message: `Your challenge "${challenge.title}" has been assigned to ${institution.name}.`,
          challenge_id: challenge._id
        });
      }
    } catch (notifErr) {
      console.error('Notification failed:', notifErr);
    }

    // Send WhatsApp notification if complaint originated from WhatsApp
    whatsappNotification.sendStatusNotification(challenge, 'assigned', {
      institutionName: institution.name
    }).catch(err => console.error('WhatsApp notification failed:', err.message));

    res.json({ message: 'Challenge assigned successfully', challenge });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update challenge status
// @route   PUT /api/admin/challenges/:id/status
// @access  Private/Admin
const updateChallengeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (req.user.role === 'institution') {
      if (!challenge.institution || challenge.institution.toString() !== req.user.institutionId.toString()) {
        return res.status(403).json({ message: 'You can only update challenges assigned to your institution' });
      }
      // Institutions shouldn't be able to reject or request info using admin endpoints ideally, but we will allow basic status updates
    }

    if (!canTransition(challenge.status, status)) {
      return res.status(400).json({ message: `Cannot transition from ${challenge.status} to ${status}` });
    }

    let reason = null;

    if (status === 'rejected') {
      if (!req.body.rejectionReason || !req.body.rejectionReason.trim()) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }
      reason = req.body.rejectionReason.trim();
      challenge.rejectionReason = reason;
      challenge.rejectedBy = req.user._id;
      challenge.rejectedAt = new Date();
    } else if (status === 'information_requested') {
      if (!req.body.message || !req.body.message.trim()) {
        return res.status(400).json({ message: 'Information request message is required' });
      }
      reason = req.body.message.trim();
      challenge.informationRequest = {
        message: reason,
        requestedBy: req.user._id,
        requestedAt: new Date()
      };
    } else if (status === 'verified') {
      challenge.verifiedAt = new Date();
      challenge.verifiedBy = req.user._id;
    } else if (status === 'resolved') {
      challenge.resolvedAt = new Date();
      challenge.resolvedBy = req.user._id;
    }

    challenge.statusHistory.push({
      from: challenge.status,
      to: status,
      changedBy: req.user._id,
      changedByRole: req.user.role,
      reason: reason,
      changedAt: new Date()
    });

    challenge.status = status;
    await challenge.save();

    // Create notification for the user based on status
    try {
      if (challenge.user) {
        let title = '';
        let message = '';
        if (status === 'rejected') {
          title = 'Challenge Rejected';
          message = `Your challenge "${challenge.title}" was rejected. Reason: ${reason}`;
        } else if (status === 'information_requested') {
          title = 'Information Requested';
          message = `More information is needed for your challenge "${challenge.title}": ${reason}`;
        } else if (status === 'verified') {
          title = 'Challenge Verified';
          message = `Your challenge "${challenge.title}" has been verified and will be assigned soon.`;
        } else if (status === 'resolved') {
          title = 'Challenge Resolved';
          message = `Your challenge "${challenge.title}" has been successfully resolved.`;
        } else if (status === 'in_progress') {
          title = 'Project Started';
          message = `Work has begun on your challenge "${challenge.title}".`;
        }

        if (title && message) {
          await Notification.create({
            recipient: challenge.user,
            type: status,
            title,
            message,
            challenge_id: challenge._id
          });
        }
      }
    } catch (notifErr) {
      console.error('Notification failed:', notifErr);
    }

    // Send WhatsApp notification if complaint originated from WhatsApp
    whatsappNotification.sendStatusNotification(challenge, status, {
      reason: reason,
      message: req.body.message
    }).catch(err => console.error('WhatsApp notification failed:', err.message));

    res.json({ message: `Challenge marked as ${status}`, challenge });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
  try {
    const districts = ['Ranchi', 'Dhanbad', 'Jamshedpur', 'Bokaro', 'Hazaribagh', 'Deoghar'];

    // Aggregation pipeline to group by district and calculate stats
    const stats = await Challenge.aggregate([
      {
        $group: {
          _id: "$district",
          submitted: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $in: ["$status", ["assigned", "in_progress"]] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
        }
      }
    ]);

    const formatted = stats.map(s => [
      s._id,
      s.submitted.toString(),
      s.inProgress.toString(),
      s.completed.toString(),
      Math.floor(Math.random() * 20 + 5).toString() // Mock Institutions Active
    ]);

    // Fill in missing districts if empty DB
    if (formatted.length === 0) {
      return res.json([
        ['Ranchi', '0', '0', '0', '0'],
        ['Dhanbad', '0', '0', '0', '0']
      ]);
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all institutions
// @route   GET /api/admin/institutions
// @access  Private/Admin
const getAllInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all industries
// @route   GET /api/admin/industries
// @access  Private/Admin
const getAllIndustries = async (req, res) => {
  try {
    const Industry = require('../models/Industry');
    const industries = await Industry.find().populate('associatedProjects');
    res.json(industries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single institution by ID
// @route   GET /api/admin/institutions/:id
// @access  Private/Admin
const getInstitutionById = async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    const assignedChallenges = await Challenge.find({ institution: institution._id }).select('title status category district createdAt urgencySeverity');
    res.json({ institution, assignedChallenges });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single industry by ID
// @route   GET /api/admin/industries/:id
// @access  Private/Admin
const getIndustryById = async (req, res) => {
  try {
    const Industry = require('../models/Industry');
    const industry = await Industry.findById(req.params.id).populate('associatedProjects');
    if (!industry) {
      return res.status(404).json({ message: 'Industry not found' });
    }
    res.json(industry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending verification queue
// @route   GET /api/admin/verifications
// @access  Private/Admin
const getVerificationQueue = async (req, res) => {
  try {
    const Institution = require('../models/Institution');
    const Industry = require('../models/Industry');

    const pendingInstitutions = await Institution.find({ verificationStatus: 'Pending' }).sort({ createdAt: -1 });
    const pendingIndustries = await Industry.find({ verificationStatus: 'Pending' }).sort({ createdAt: -1 });

    const formatted = [...pendingInstitutions, ...pendingIndustries].map(org => ({
      _id: org._id,
      name: org.name,
      email: org.email,
      phone: org.phone,
      role: org.role,
      createdAt: org.createdAt,
      verificationStatus: org.verificationStatus
    })).sort((a, b) => b.createdAt - a.createdAt);

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user verification status
// @route   PUT /api/admin/verifications/:id
// @access  Private/Admin
const updateVerificationStatus = async (req, res) => {
  try {
    const Institution = require('../models/Institution');
    const Industry = require('../models/Industry');
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let org = await Institution.findById(req.params.id);
    if (!org) {
      org = await Industry.findById(req.params.id);
    }

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    org.verificationStatus = status;
    await org.save();

    res.json({ success: true, message: `Account ${status.toLowerCase()} successfully`, user: org });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getKPIs,
  getReviewQueue,
  getMatches,
  assignChallenge,
  updateChallengeStatus,
  getAnalytics,
  getAllInstitutions,
  getAllIndustries,
  getInstitutionById,
  getIndustryById,
  getVerificationQueue,
  updateVerificationStatus
};
