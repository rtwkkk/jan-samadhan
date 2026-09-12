const Challenge = require('../models/Challenge');
const aiService = require('../services/aiService');

// @desc    Submit a new challenge
// @route   POST /api/challenges
// @access  Public (or Private depending on user logic)
exports.submitChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      district,
      villageCityBlock,
      latitude,
      longitude,
      peopleAffected,
      fullName,
      mobileNumber,
      email,
      consent
    } = req.body;

    // Validate Required Fields
    if (!title || !description || !district || !villageCityBlock || !peopleAffected || !fullName || !mobileNumber || consent !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ message: 'Missing required fields or consent' }]
      });
    }

    if (title.length > 120) {
      return res.status(400).json({ success: false, message: 'Title exceeds 120 characters' });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const people = parseInt(peopleAffected, 10);
    if (isNaN(people) || people < 1) {
      return res.status(400).json({ success: false, message: 'People affected must be a valid positive number' });
    }

    // Validate GPS if provided
    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);
    if (latitude && longitude) {
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Invalid GPS coordinates' });
      }
    } else {
      lat = undefined;
      lng = undefined;
    }

    // Handle uploaded files
    const supportingDocuments = [];
    if (req.file) {
      supportingDocuments.push(`/uploads/${req.file.filename}`);
    } else if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        supportingDocuments.push(`/uploads/${file.filename}`);
      });
    }

    // Call AI Services concurrently
    const [aiCategoryResult, aiUrgencyResult] = await Promise.all([
      aiService.detectCategoryDepartment(description),
      aiService.verifyUrgency(description, people)
    ]);

    const aiAnalysisStatus = (aiCategoryResult.status === 'failed' || aiUrgencyResult.status === 'failed') ? 'failed' : 'completed';
    const aiConfidence = Math.min(aiCategoryResult.confidence, aiUrgencyResult.confidence);

    // Create Challenge
    const challenge = await Challenge.create({
      title,
      description,
      district,
      villageCityBlock,
      latitude: lat,
      longitude: lng,
      peopleAffected: people,
      fullName,
      mobileNumber,
      email,
      consent: consent === 'true',
      supportingDocuments,
      category: aiCategoryResult.category,
      department: aiCategoryResult.department,
      urgencySeverity: aiUrgencyResult.urgencySeverity,
      aiAnalysisStatus,
      aiConfidence,
      status: 'submitted',
      user: req.user ? req.user._id : undefined // If auth middleware attached user
    });

    res.status(201).json({
      success: true,
      message: 'Challenge submitted successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status,
        category: challenge.category,
        urgencySeverity: challenge.urgencySeverity
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
};

// @desc    Get all challenges (for admin/dashboard)
// @route   GET /api/challenges
// @access  Private/Admin
exports.getChallenges = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    const challenges = await Challenge.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: challenges.length, data: challenges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user's or institution's challenges
// @route   GET /api/challenges/my
// @access  Private
exports.getMyChallenges = async (req, res) => {
  try {
    let query = { user: req.user._id };
    if (req.user.role === 'institution') {
      query = { institution: req.user.institutionId };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    const challenges = await Challenge.find(query)
      .populate('institution')
      .sort({ createdAt: -1 });

    const Industry = require('../models/Industry');
    const industries = await Industry.find().lean();

    const User = require('../models/User');
    const enrichedChallenges = await Promise.all(challenges.map(async (c) => {
      const challengeObj = c.toObject ? c.toObject() : c;
      if (challengeObj.institution) {
        const Institution = require('../models/Institution');
        const adminUser = await Institution.findById(challengeObj.institution._id).lean();
        if (adminUser) {
          challengeObj.institution.professorName = adminUser.name;
        }
      }
      return challengeObj;
    }));

    res.status(200).json({ success: true, count: enrichedChallenges.length, data: enrichedChallenges, industries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single challenge
// @route   GET /api/challenges/:id
// @access  Public/Private
exports.getChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    // Prevent sensitive info leak
    const data = challenge.toObject();
    if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== data.user?.toString())) {
      delete data.mobileNumber;
      delete data.email;
      delete data.fullName;
    }

    // Active project popup formatting (only for non-admin user dashboard popup)
    if ((data.status === 'in_progress' || data.status === 'assigned') && (!req.user || req.user.role !== 'admin')) {
      data.complaint_id = data._id;
      data.challenge_type = data.category;
      data.location = `${data.villageCityBlock || ''}, ${data.district || ''}`.replace(/^, | , $/g, '').trim();
      data.priority = data.urgencySeverity;
      
      if (data.assignment) {
        data.assigned_college = {
          id: data.assignment.institution_id,
          name: data.assignment.institution_name,
          department: data.assignment.department
        };
        data.team_members = [];
        if (data.assignment.professor_id) {
          data.team_members.push({
            user_id: data.assignment.professor_id,
            name: data.assignment.professor_name || 'Assigned Professor',
            role: 'Professor'
          });
        }
      }
      
      // Remove description from popup response for non-admin users only
      delete data.description;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Respond to an information request
// @route   POST /api/challenges/:id/respond
// @access  Private
exports.respondToInformationRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (challenge.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this challenge' });
    }

    if (challenge.status !== 'information_requested') {
      return res.status(400).json({ success: false, message: 'No information requested for this challenge' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Response message is required' });
    }

    // Process file upload if present
    const attachments = [];
    if (req.file) {
      attachments.push(req.file.path.replace(/\\/g, '/'));
    }

    challenge.additionalInformation = {
      message: message.trim(),
      attachments,
      submittedAt: new Date(),
      submittedBy: req.user._id
    };

    challenge.statusHistory.push({
      from: challenge.status,
      to: 'under_review',
      changedBy: req.user._id,
      changedByRole: req.user.role || 'user',
      reason: 'Citizen responded to information request',
      changedAt: new Date()
    });

    challenge.status = 'under_review';
    await challenge.save();

    res.status(200).json({ success: true, message: 'Information submitted successfully', data: challenge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
