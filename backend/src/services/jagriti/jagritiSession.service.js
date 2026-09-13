/**
 * Jagriti Session Service
 *
 * Orchestrates the complete pipeline:
 *   validate voice data → store draft → AI processing → create Challenge → notify
 *
 * Uses the existing Challenge model directly (same creation logic as submitChallenge)
 * and stores an auditable JagritiComplaintDraft for every session.
 */
const JagritiComplaintDraft = require('../../models/JagritiComplaintDraft');
const Challenge = require('../../models/Challenge');
const jagritiAI = require('./jagritiAI.service');
const { isValidIndianMobile } = require('../../utils/phoneValidation');

/**
 * Validates all voice-collected fields.
 * Returns { valid: true } or { valid: false, message: '...' }.
 */
function validateVoiceData(data) {
  const { phone, call_summary, description, challengeDescription, citizen_name, location, village_city_block, people_affected, sessionId } = data;

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    return { valid: false, message: 'sessionId is required' };
  }

  if (!phone) {
    return { valid: false, message: 'Phone number is required' };
  }
  const normalizedPhone = isValidIndianMobile(phone);
  if (!normalizedPhone) {
    return { valid: false, message: 'Invalid 10-digit Indian mobile number' };
  }

  const finalDesc = description || challengeDescription || call_summary;
  if (!finalDesc || typeof finalDesc !== 'string' || finalDesc.trim().length < 10) {
    return { valid: false, message: 'description/call_summary is required and must contain a meaningful description (min 10 characters)' };
  }

  if (!citizen_name || typeof citizen_name !== 'string' || citizen_name.trim().length < 2) {
    return { valid: false, message: 'citizen_name is required' };
  }

  if (!location || typeof location !== 'string' || !location.trim()) {
    return { valid: false, message: 'location is required' };
  }

  if (!village_city_block || typeof village_city_block !== 'string' || !village_city_block.trim()) {
    return { valid: false, message: 'village_city_block is required' };
  }

  const people = parseInt(people_affected, 10);
  if (isNaN(people) || people < 1) {
    return { valid: false, message: 'people_affected must be a positive number (>= 1)' };
  }

  // Optional email validation
  if (data.citizen_email && typeof data.citizen_email === 'string' && data.citizen_email.trim()) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(data.citizen_email.trim())) {
      return { valid: false, message: 'citizen_email has an invalid format' };
    }
  }

  return { valid: true, normalizedPhone };
}

/**
 * Processes a voice session submission end-to-end.
 *
 * @param {Object} voiceData - Raw payload from the voice agent
 * @returns {Promise<Object>} - Structured result
 */
async function processSession(voiceData) {
  const {
    sessionId,
    phone,
    call_disposition,
    call_summary,
    description,
    challengeDescription,
    title,
    challengeTitle,
    challenge_title,
    citizen_email,
    citizen_name,
    complaint_type,
    location,
    people_affected,
    village_city_block
  } = voiceData;

  const normalizedPhone = isValidIndianMobile(phone);
  const finalDesc = description || challengeDescription || call_summary;
  const finalTitle = title || challengeTitle || challenge_title;

  // ── Step 1: Idempotency check ──
  const existingDraft = await JagritiComplaintDraft.findOne({ sessionId });
  if (existingDraft && existingDraft.processingStatus === 'completed' && existingDraft.complaintId) {
    // Already processed — return the existing complaint
    const existingChallenge = await Challenge.findById(existingDraft.complaintId);
    return {
      success: true,
      duplicate: true,
      message: 'This session was already processed',
      sessionId,
      complaint: {
        complaint_id: existingDraft.complaintId.toString(),
        title: existingDraft.aiGenerated?.title || existingChallenge?.title,
        department: existingDraft.aiGenerated?.department || existingChallenge?.department,
        priority: existingDraft.aiGenerated?.priority || existingChallenge?.urgencySeverity,
        status: existingChallenge?.status || 'submitted'
      }
    };
  }

  // ── Step 2: Create or update draft with status 'collected' ──
  let draft;
  if (existingDraft) {
    // Draft exists but wasn't completed (e.g. failed previously) — update it for retry
    draft = existingDraft;
    draft.phoneNumber = normalizedPhone;
    draft.citizenName = citizen_name?.trim();
    draft.citizenEmail = citizen_email?.trim()?.toLowerCase() || undefined;
    draft.callDisposition = call_disposition?.trim();
    draft.callSummary = finalDesc?.trim();
    draft.complaintType = complaint_type?.trim();
    draft.location = location?.trim();
    draft.villageCityBlock = village_city_block?.trim();
    draft.peopleAffected = parseInt(people_affected, 10);
    // Temporarily stash the provided title in processingError just so we have it if needed (we aren't adding schema fields)
    // Actually, we can just pass it directly in memory since draft is in scope for step 3.
    draft.processingStatus = 'collected';
    draft.processingError = undefined;
    await draft.save();
  } else {
    draft = await JagritiComplaintDraft.create({
      sessionId,
      phoneNumber: normalizedPhone,
      citizenName: citizen_name?.trim(),
      citizenEmail: citizen_email?.trim()?.toLowerCase() || undefined,
      callDisposition: call_disposition?.trim(),
      callSummary: finalDesc?.trim(),
      complaintType: complaint_type?.trim(),
      location: location?.trim(),
      villageCityBlock: village_city_block?.trim(),
      peopleAffected: parseInt(people_affected, 10),
      processingStatus: 'collected'
    });
  }

  // ── Step 3: AI Processing ──
  draft.processingStatus = 'ai_processing';
  await draft.save();

  const aiResult = await jagritiAI.processVoiceData({
    callSummary: draft.callSummary,
    complaintType: draft.complaintType,
    peopleAffected: draft.peopleAffected,
    providedTitle: finalTitle
  });

  if (!aiResult.success) {
    draft.processingStatus = 'failed';
    draft.processingError = aiResult.error || 'AI processing returned unsuccessful result';
    await draft.save();
    return {
      success: false,
      message: 'AI processing failed. Draft saved for retry.',
      sessionId,
      errorCode: 'AI_PROCESSING_FAILED'
    };
  }

  // ── Step 4: Store AI-generated fields in draft ──
  draft.aiGenerated = {
    title: aiResult.title,
    department: aiResult.department,
    category: aiResult.category,
    priority: aiResult.priority,
    confidence: aiResult.confidence
  };
  draft.processingStatus = 'ready_for_complaint';
  await draft.save();

  // ── Step 5: Create the real Challenge through existing model ──
  draft.processingStatus = 'complaint_creating';
  await draft.save();

  let challenge;
  try {
    challenge = await Challenge.create({
      title: aiResult.title,
      description: call_summary || draft.description, // Map original call_summary distinctly if available
      category: aiResult.category,
      department: aiResult.department,
      urgencySeverity: aiResult.priority,
      district: draft.location,
      villageCityBlock: draft.villageCityBlock,
      peopleAffected: draft.peopleAffected,
      fullName: draft.citizenName,
      mobileNumber: draft.phoneNumber,
      email: draft.citizenEmail || undefined,
      consent: true,
      status: 'submitted',
      aiAnalysisStatus: 'completed',
      aiConfidence: aiResult.confidence,
      source: 'VOICE'
    });
  } catch (err) {
    draft.processingStatus = 'failed';
    draft.processingError = 'Challenge creation failed: ' + (err.message || 'Unknown error');
    await draft.save();
    console.error('[JagritiSession] Challenge creation error:', err);
    return {
      success: false,
      message: 'Complaint creation failed. Draft saved for retry.',
      sessionId,
      errorCode: 'COMPLAINT_CREATION_FAILED'
    };
  }

  // ── Step 6: Update draft with complaint ID ──
  draft.complaintId = challenge._id;
  draft.processingStatus = 'completed';
  draft.processingError = undefined;
  await draft.save();

  // ── Step 7: Send notification (stubbed — no existing Notification model) ──
  try {
    console.log(`[JagritiNotification] Complaint created for ${draft.phoneNumber}: ID=${challenge._id}, Title="${aiResult.title}", Dept="${aiResult.department}", Priority="${aiResult.priority}", Status="submitted"`);
  } catch (notifErr) {
    // Notification failure must NOT roll back the complaint
    console.error('[JagritiNotification] Failed to send notification:', notifErr);
  }

  // ── Step 8: Return result ──
  return {
    success: true,
    message: 'Complaint created successfully via Jagriti',
    sessionId,
    complaint: {
      complaint_id: challenge._id.toString(),
      title: aiResult.title,
      department: aiResult.department,
      priority: aiResult.priority,
      status: challenge.status
    }
  };
}

/**
 * Retrieves the current status of a Jagriti session draft.
 */
async function getSessionStatus(sessionId) {
  const draft = await JagritiComplaintDraft.findOne({ sessionId });
  if (!draft) {
    return { success: false, message: 'Session not found' };
  }

  const result = {
    success: true,
    sessionId: draft.sessionId,
    processingStatus: draft.processingStatus,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt
  };

  if (draft.processingStatus === 'completed' && draft.complaintId) {
    const challenge = await Challenge.findById(draft.complaintId);
    result.complaint = {
      complaint_id: draft.complaintId.toString(),
      title: draft.aiGenerated?.title || challenge?.title,
      department: draft.aiGenerated?.department || challenge?.department,
      priority: draft.aiGenerated?.priority || challenge?.urgencySeverity,
      status: challenge?.status || 'submitted'
    };
  }

  if (draft.processingStatus === 'failed') {
    result.error = draft.processingError;
  }

  return result;
}

module.exports = {
  validateVoiceData,
  processSession,
  getSessionStatus
};
