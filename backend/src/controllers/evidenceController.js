const VoiceCall = require('../models/VoiceCall');
const Challenge = require('../models/Challenge');
const aiService = require('../services/aiService');

/**
 * @desc    Receive evidence (files + GPS location) for a voice-call-initiated challenge.
 * @route   POST /api/evidence/:leadId
 * @access  Public (accessed from email link)
 */
exports.submitEvidence = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { latitude, longitude, district, villageCityBlock } = req.body;

    // 1. Validate lead exists
    const voiceCall = await VoiceCall.findOne({ sarvamLeadId: leadId });
    if (!voiceCall) {
      return res.status(404).json({ success: false, message: 'Voice call record not found. Invalid or expired link.' });
    }

    // 2. Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates (latitude, longitude) are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Invalid GPS coordinates provided.' });
    }

    // 3. Collect uploaded files
    const supportingDocuments = [];
    if (req.file) {
      supportingDocuments.push(`/uploads/${req.file.filename}`);
    } else if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        supportingDocuments.push(`/uploads/${file.filename}`);
      });
    }

    // 4. Build description from the call summary
    const description = voiceCall.callSummary || voiceCall.callTranscript || 'Concern reported via Jan Samadhan Voice Agent (Jagriti).';
    const title = voiceCall.callSummary
      ? voiceCall.callSummary.substring(0, 120)
      : 'Voice-Reported Challenge';

    // 5. Run AI analysis
    let aiCategoryResult = { category: 'Other', department: 'Other', confidence: 0, status: 'failed' };
    let aiUrgencyResult = { urgencySeverity: 'Medium', confidence: 0, status: 'failed' };
    try {
      [aiCategoryResult, aiUrgencyResult] = await Promise.all([
        aiService.detectCategoryDepartment(description),
        aiService.verifyUrgency(description, 1)
      ]);
    } catch (aiErr) {
      console.warn('[Evidence] AI analysis failed, using defaults:', aiErr.message);
    }

    const aiAnalysisStatus = (aiCategoryResult.status === 'failed' || aiUrgencyResult.status === 'failed') ? 'failed' : 'completed';
    const aiConfidence = Math.min(aiCategoryResult.confidence || 0, aiUrgencyResult.confidence || 0);

    // 6. Create the Challenge document
    const challenge = await Challenge.create({
      title,
      description,
      district: district || 'Not specified',
      villageCityBlock: villageCityBlock || 'Not specified',
      latitude: lat,
      longitude: lng,
      peopleAffected: 1,
      fullName: voiceCall.userName || 'Citizen',
      mobileNumber: voiceCall.userPhone ? voiceCall.userPhone.replace('+91', '') : '0000000000',
      email: voiceCall.userEmail || '',
      consent: true,
      supportingDocuments,
      source: 'VOICE',
      category: aiCategoryResult.category,
      department: aiCategoryResult.department,
      urgencySeverity: aiUrgencyResult.urgencySeverity,
      aiAnalysisStatus,
      aiConfidence,
      status: 'submitted'
    });

    // 7. Update the VoiceCall record to link the challenge
    await VoiceCall.updateOne(
      { sarvamLeadId: leadId },
      { $set: { challengeId: challenge._id, evidenceSubmitted: true } }
    );

    res.status(201).json({
      success: true,
      message: 'Evidence submitted successfully. Your challenge has been registered.',
      challenge: {
        id: challenge._id,
        trackingId: challenge._id.toString(),
        status: challenge.status
      }
    });

  } catch (error) {
    console.error('[Evidence] Error processing evidence submission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing your submission. Please try again later.'
    });
  }
};

/**
 * @desc    Get voice call info for the evidence upload page.
 * @route   GET /api/evidence/:leadId
 * @access  Public
 */
exports.getEvidenceInfo = async (req, res) => {
  try {
    const voiceCall = await VoiceCall.findOne({ sarvamLeadId: req.params.leadId });
    if (!voiceCall) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.json({
      success: true,
      data: {
        userName: voiceCall.userName,
        callSummary: voiceCall.callSummary || 'Not available',
        evidenceSubmitted: voiceCall.evidenceSubmitted || false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
