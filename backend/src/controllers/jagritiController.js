/**
 * Jagriti Controller
 *
 * Handles HTTP requests for the Jagriti voice-agent integration.
 * Does NOT create complaints directly — delegates to jagritiSession.service.
 */
const jagritiSessionService = require('../services/jagriti/jagritiSession.service');

// ── Simple in-memory rate limiter for call initiation ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3;       // max 3 per minute per phone

function checkRateLimit(phone) {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);

  if (!entry) {
    rateLimitMap.set(phone, { count: 1, windowStart: now });
    return true;
  }

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Window expired — reset
    rateLimitMap.set(phone, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// @desc    Submit structured voice session data for complaint creation
// @route   POST /api/jagriti/session
// @access  Server-to-server (future: provider-authenticated)
exports.submitSession = async (req, res) => {
  try {
    // ── Validate input ──
    const validation = jagritiSessionService.validateVoiceData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // ── Rate limiting ──
    const phone = validation.normalizedPhone;
    if (!checkRateLimit(phone)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests for this phone number. Please wait before retrying.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // ── Process the session (validate → store draft → AI → create complaint) ──
    const result = await jagritiSessionService.processSession(req.body);

    if (result.success) {
      const statusCode = result.duplicate ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
        complaint: result.complaint
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        sessionId: result.sessionId,
        errorCode: result.errorCode || 'PROCESSING_FAILED'
      });
    }
  } catch (error) {
    console.error('[JagritiController] submitSession error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing voice session',
      errorCode: 'SERVER_ERROR'
    });
  }
};

// @desc    Get the processing status of a Jagriti session
// @route   GET /api/jagriti/session/:sessionId
// @access  Server-to-server (future: provider-authenticated)
exports.getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !sessionId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'sessionId is required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const result = await jagritiSessionService.getSessionStatus(sessionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[JagritiController] getSessionStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving session status',
      errorCode: 'SERVER_ERROR'
    });
  }
};
