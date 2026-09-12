/**
 * WhatsApp Conversation Service
 *
 * AI-driven conversational handler for WhatsApp messages.
 * Translated from the CRM's conversation-handler.ts, intent-classifier.ts,
 * complaint-registration-flow.ts, and complaint-status-flow.ts into
 * Jan Samadhan's Express.js / CommonJS architecture.
 *
 * Uses the existing Challenge model for complaint creation (same DB).
 * Uses Groq API for AI conversation (with fallback to deterministic responses).
 */
const axios = require('axios');
const Challenge = require('../../models/Challenge');
const WhatsAppMessage = require('../../models/WhatsAppMessage');
const whatsappService = require('../whatsappService');
const { isValidIndianMobile } = require('../../utils/phoneValidation');

// ── Menu Text ──
const MENU_TEXT = `Namaskar! 🙏 Jan Samadhan Citizen Portal mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?

1. Register Complaint (Nayi shikayat darj karein)
2. Check Complaint Status (Apni shikayat ki sthiti dekhein)
3. Other Help (Anya madad)

Kripya 1, 2, ya 3 reply karein.`;

// ── In-memory session store ──
// Tracks current conversation state per phone number
// In production, this could be moved to Redis/MongoDB for persistence
const sessions = new Map();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get or create a session for a phone number.
 */
function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing && (Date.now() - existing.lastActivity) < SESSION_TIMEOUT_MS) {
    existing.lastActivity = Date.now();
    return existing;
  }
  const session = {
    phone,
    state: 'MENU', // MENU | REGISTERING | CHECKING_STATUS | OTHER_HELP
    draft: {},
    lastActivity: Date.now()
  };
  sessions.set(phone, session);
  return session;
}

/**
 * Reset session to menu state.
 */
function resetSession(phone) {
  sessions.delete(phone);
}

// ── Groq AI Helper ──

/**
 * Call Groq API for AI-powered responses.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string|null>}
 */
async function callGroqAI(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[WhatsApp AI] GROQ_API_KEY not configured, using deterministic responses');
    return null;
  }

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 1024
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 15000
    });

    return response.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('[WhatsApp AI] Groq API error:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Call Groq API and parse JSON response.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<Object|null>}
 */
async function callGroqJSON(messages) {
  const raw = await callGroqAI(messages);
  if (!raw) return null;

  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error('[WhatsApp AI] Failed to parse AI JSON:', err.message);
    return null;
  }
}

// ── Intent Classification ──

/**
 * Detect user intent from message text.
 * Translated from the CRM's intent-classifier.ts.
 */
async function detectIntent(history, userMessage) {
  const userLower = userMessage.trim().toLowerCase();

  // Deterministic routing for clear inputs
  if (/^(hi|hello|namaste|hey|start|menu|haan ji|namaskar)\b/i.test(userLower)) return 'GREETING';
  if (/^1\.?$/.test(userLower) || userLower === 'register' || userLower === 'register complaint') return 'REGISTER_COMPLAINT';
  if (/^2\.?$/.test(userLower) || userLower === 'status' || userLower === 'check status') return 'CHECK_STATUS';
  if (/^3\.?$/.test(userLower) || userLower === 'help' || userLower === 'other help') return 'OTHER_HELP';

  // AI classification for ambiguous inputs
  const systemPrompt = {
    role: 'system',
    content: `You are a strict intent classifier for a citizen WhatsApp bot in India.
The citizens speak simple Hindi, Hinglish, or English.
Classify the user's latest message into EXACTLY ONE of these categories. Return ONLY the category name.

Categories:
GREETING (e.g., hi, hello, namaste, start, hey)
REGISTER_COMPLAINT (e.g., paani nahi aa raha, road toot gayi hai, bijli kharab hai, report a problem, 1)
CHECK_STATUS (e.g., meri complaint ka kya hua, status batao, track complaint, 2)
OTHER_HELP (e.g., mujhe madad chahiye, other, 3)
UNKNOWN (unrelated, ambiguous)

User's latest message: "${userMessage}"`
  };

  const recentHistory = history.slice(-5);
  const response = await callGroqAI([...recentHistory, systemPrompt]);

  if (!response) return 'UNKNOWN';
  const clean = response.toUpperCase();

  if (clean.includes('REGISTER_COMPLAINT')) return 'REGISTER_COMPLAINT';
  if (clean.includes('CHECK_STATUS')) return 'CHECK_STATUS';
  if (clean.includes('OTHER_HELP')) return 'OTHER_HELP';
  if (clean.includes('GREETING')) return 'GREETING';
  return 'UNKNOWN';
}

// ── Complaint Registration Flow ──
// Translated from the CRM's complaint-registration-flow.ts

/**
 * Handle the complaint registration conversation flow.
 * Uses AI to collect complaint details conversationally.
 */
async function handleComplaintRegistration(phone, history) {
  const extractionPrompt = {
    role: 'system',
    content: `You are a helpful WhatsApp assistant for citizens in India (Jan Samadhan portal).
Your job is to read the conversation, extract the complaint details, and formulate the NEXT natural response to the citizen.

Rules for conversation (nextMessageToCitizen):
1. CITIZEN-FRIENDLY LANGUAGE: Use simple everyday Hindi/Hinglish (e.g., "Achha, samajh gaya", "Aapko kis cheez ki problem hai?", "Ye problem kis district mein hai?").
2. ONE QUESTION AT A TIME: Never dump multiple questions. Determine ONE missing required field and ask for it.
3. VAGUE INPUT & MULTIPLE ISSUES: If input is vague ("road kharab hai"), ask ONE clarifying question. If they mention multiple issues, ask which one to register first.
4. CONFIRMATION: When ALL required fields (citizenName, complaintType, description, district, villageCityBlock) AND evidence availability are known, write a short conversational summary and ask for explicit confirmation.

Rules for extraction:
- Infer 'department' (e.g., Water Supply, Electricity, Roads/Public Works, Municipal/Sanitation) based on their own words.
- Infer 'priority' (Low, Medium, High, Critical) from duration/severity.
- If they explicitly confirm the summary (e.g., "haan", "yes", "sahi hai", "kar do", "ji haan"), set "isConfirmed": true.
- If they cancel or correct during confirmation (e.g., "nahi", "galat hai", "change karna hai"), set "isConfirmed": false.

Output valid JSON ONLY. Only include fields that were provided or confidently inferred.

JSON Schema:
{
  "citizenName": "string",
  "complaintType": "string",
  "description": "string",
  "district": "string",
  "villageCityBlock": "string",
  "location": "string",
  "peopleAffected": 50,
  "evidenceAvailable": false,
  "isConfirmed": false,
  "isCanceled": false,
  "department": "string",
  "priority": "string",
  "nextMessageToCitizen": "string (your natural Hinglish response)"
}`
  };

  const draft = await callGroqJSON([...history, extractionPrompt]);

  if (!draft) {
    return "Sorry ji, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye.";
  }

  draft.phone = phone;

  if (draft.isCanceled) {
    resetSession(phone);
    return "Complaint cancel ho gayi hai. Nayi complaint ke liye 'hi' bhejein.";
  }

  // Check REQUIRED fields
  const missingFields = [];
  if (!draft.citizenName?.trim()) missingFields.push('name');
  if (!draft.complaintType?.trim()) missingFields.push('complaintType');
  if (!draft.description?.trim()) missingFields.push('description');
  if (!draft.district?.trim()) missingFields.push('district');
  if (!draft.villageCityBlock?.trim()) missingFields.push('villageCityBlock');

  // AI can never confirm if required fields are missing
  if (draft.isConfirmed && missingFields.length > 0) {
    draft.isConfirmed = false;
    draft.nextMessageToCitizen = undefined;
  }

  if (!draft.isConfirmed) {
    if (missingFields.length > 0) {
      const fieldQuestions = {
        'name': "Achha 👍 Aapka full name kya hai?",
        'complaintType': "Aapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.",
        'description': "Theek hai 👍 Problem kya hai, thoda bataiye.",
        'district': "Ye problem kis district mein hai?",
        'villageCityBlock': "Aapke gaon, city ya block ka naam kya hai?"
      };
      return draft.nextMessageToCitizen || fieldQuestions[missingFields[0]];
    }

    // All required fields present but not confirmed — ask for evidence or confirmation
    if (draft.evidenceAvailable === undefined) {
      return draft.nextMessageToCitizen || "Aapke paas iski koi photo ya video hai? (Haan/Nahi)";
    }

    // Deterministic Summary Fallback
    let summary = "Achha ji, complaint register karne se pehle ek baar details check kar lete hain:\n\n";
    summary += `Name: ${draft.citizenName}\n`;
    summary += `Type: ${draft.complaintType}\n`;
    summary += `Description: ${draft.description}\n`;
    summary += `District: ${draft.district}\n`;
    summary += `Village/City: ${draft.villageCityBlock}\n`;
    summary += "\nSab sahi hai? Haan/Yes ya Nahi/No bataiye.";

    return draft.nextMessageToCitizen || summary;
  }

  // ── CONFIRMED: Create Challenge using existing model ──
  try {
    // Map AI priority to Challenge schema values
    const priorityMap = {
      'low': 'Low', 'medium': 'Medium', 'high': 'High',
      'critical': 'Critical', 'urgent': 'Critical'
    };
    const urgency = priorityMap[(draft.priority || 'medium').toLowerCase()] || 'Medium';

    // Normalize phone to 10-digit Indian mobile
    const normalizedPhone = isValidIndianMobile(phone) || phone;

    const challenge = await Challenge.create({
      title: `${draft.complaintType} - ${draft.district}`.substring(0, 120),
      description: draft.description,
      category: draft.complaintType,
      department: draft.department || 'Other',
      urgencySeverity: urgency,
      district: draft.district,
      villageCityBlock: draft.villageCityBlock,
      peopleAffected: typeof draft.peopleAffected === 'number' && draft.peopleAffected >= 1 ? draft.peopleAffected : 1,
      fullName: draft.citizenName,
      mobileNumber: normalizedPhone,
      email: draft.email || undefined,
      consent: true,
      status: 'submitted',
      aiAnalysisStatus: 'completed',
      aiConfidence: 0.85,
      source: 'WHATSAPP',
      whatsappPhone: phone
    });

    resetSession(phone);
    return `✅ Aapki complaint successfully register ho gayi hai!\n\nComplaint ID: ${challenge._id}\nTitle: ${challenge.title}\nStatus: Submitted\n\nStatus check karne ke liye ye ID yaad rakhein.\nMenu ke liye 'hi' bhejein.`;
  } catch (err) {
    console.error('[WhatsApp] Complaint creation error:', err);
    return "Maaf karna, complaint save karte waqt error aa gaya. Thodi der mein try karein.";
  }
}

// ── Complaint Status Flow ──
// Translated from the CRM's complaint-status-flow.ts

/**
 * Handle complaint status check.
 */
async function handleStatusCheck(userMessage) {
  // Try to extract a MongoDB ObjectId or any ID-like pattern
  const objectIdMatch = userMessage.match(/[0-9a-fA-F]{24}/);
  const idMatch = objectIdMatch ? objectIdMatch[0] : null;

  if (!idMatch) {
    return "Ji, kripya apna Complaint ID bhejiye. Aapki complaint register hone par jo ID mili thi woh bhejein.";
  }

  try {
    const challenge = await Challenge.findById(idMatch);

    if (!challenge) {
      return "Ji, is Complaint ID se koi complaint nahi mili. Kripya Complaint ID check karke dobara bhejiye.";
    }

    const statusMap = {
      submitted: 'Submitted ✍️',
      under_review: 'Under Review 🔍',
      information_requested: 'Information Requested ❓',
      verified: 'Verified ✅',
      assigned: 'Assigned to University 🏛️',
      in_progress: 'In Progress 🚧',
      resolved: 'Resolved ✅',
      rejected: 'Rejected ❌'
    };

    const readableStatus = statusMap[challenge.status] || challenge.status;
    let response = `*Complaint Details:*\n\n`;
    response += `*ID:* ${challenge._id}\n`;
    response += `*Title:* ${challenge.title}\n`;
    response += `*Status:* ${readableStatus}\n`;
    response += `*Category:* ${challenge.category}\n`;
    response += `*District:* ${challenge.district}\n`;
    response += `*Priority:* ${challenge.urgencySeverity}\n`;

    if (challenge.assignment?.institution_name) {
      response += `*Assigned To:* ${challenge.assignment.institution_name}\n`;
    }

    response += `\nDoosri complaint ka status check karne ke liye ID bhejein, ya menu ke liye 'hi' type karein.`;
    return response;
  } catch (err) {
    console.error('[WhatsApp] Status check error:', err);
    return "Maaf karna, status check karte waqt error aa gaya. Thodi der mein try karein.";
  }
}

// ── Other Help Flow ──

const OTHER_HELP_TEXT = `Aap in mein se kisi bhi topic par madad le sakte hain:

4. Jan Samadhan Portal kya hai?
5. Complaint kaise register karein?
6. Status kaise check karein?
7. Complaint reject hone par kya karein?
8. Contact Information

Kripya 4 se 8 mein se reply karein.`;

const OTHER_HELP_RESPONSES = {
  '4': `*Jan Samadhan Portal* ek Jharkhand Government initiative hai jahan citizens apni shikayatein darj kar sakte hain. Government, Universities aur Industry milkar aapki problems solve karte hain.\n\nMenu ke liye 'hi' bhejein.`,
  '5': `*Complaint Register Karne ke Steps:*\n1. 'hi' type karein\n2. Option 1 choose karein\n3. Apna naam, problem, district batayein\n4. Confirm karein\n5. Complaint ID note karein!\n\nMenu ke liye 'hi' bhejein.`,
  '6': `*Status Check Karne ke Steps:*\n1. 'hi' type karein\n2. Option 2 choose karein\n3. Apna Complaint ID bhejein\n\nMenu ke liye 'hi' bhejein.`,
  '7': `Agar aapki complaint reject ho gayi hai, toh:\n1. Rejection reason padhein\n2. Agar zaruri ho toh naye evidence ke saath dobara register karein\n3. Web portal par bhi dubara submit kar sakte hain\n\nMenu ke liye 'hi' bhejein.`,
  '8': `*Jan Samadhan Contact:*\nWebsite: jan-samadhan.gov.in\nEmail: support@jan-samadhan.gov.in\nHelpline: 1800-XXX-XXXX\n\nMenu ke liye 'hi' bhejein.`
};

function handleOtherHelp(userMessage, isFirstEntry) {
  if (isFirstEntry) return OTHER_HELP_TEXT;

  const choice = userMessage.trim().replace('.', '');
  if (OTHER_HELP_RESPONSES[choice]) {
    return OTHER_HELP_RESPONSES[choice];
  }

  return "Kripya 4 se 8 mein se koi number choose karein, ya menu ke liye 'hi' bhejein.";
}

// ── Main Conversation Handler ──

/**
 * Process an incoming WhatsApp message and generate a response.
 * This is the main entry point called by the webhook controller.
 *
 * @param {string} phone - Sender's phone number
 * @param {string} messageText - Incoming message text
 * @param {string} [waMessageId] - Meta's message ID (for deduplication)
 * @returns {Promise<void>}
 */
async function handleIncomingMessage(phone, messageText, waMessageId) {
  try {
    if (!messageText || !messageText.trim()) return;

    // ── Deduplicate ──
    if (waMessageId) {
      const existing = await WhatsAppMessage.findOne({ waMessageId });
      if (existing) {
        console.info('[WhatsApp] Duplicate message ignored:', waMessageId);
        return;
      }
    }

    // ── Store inbound message ──
    await WhatsAppMessage.create({
      phone,
      direction: 'inbound',
      content: messageText,
      messageType: 'text',
      waMessageId: waMessageId || undefined,
      status: 'received'
    });

    // ── Mark as read on WhatsApp ──
    if (waMessageId) {
      whatsappService.markAsRead(waMessageId).catch(() => {});
    }

    // ── Build conversation history for AI ──
    const recentMessages = await WhatsAppMessage.find({ phone })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const history = recentMessages.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content || ''
    })).filter(m => m.content);

    // ── Get session state ──
    const session = getSession(phone);
    const userLower = messageText.trim().toLowerCase();

    let replyText = '';

    // ── Route based on session state ──
    if (session.state === 'REGISTERING') {
      // Check for cancellation / menu return
      if (/^(cancel|menu|0|exit|quit)$/i.test(userLower)) {
        resetSession(phone);
        replyText = "Complaint registration cancel ho gayi.\n\n" + MENU_TEXT;
      } else {
        replyText = await handleComplaintRegistration(phone, history);
        // If complaint was created, session was already reset
        if (!sessions.has(phone)) {
          // Complaint was created successfully
        }
      }
    } else if (session.state === 'CHECKING_STATUS') {
      if (/^(cancel|menu|0|exit|quit|hi|hello|namaste)$/i.test(userLower)) {
        resetSession(phone);
        replyText = MENU_TEXT;
      } else {
        replyText = await handleStatusCheck(messageText);
        // Keep in status-checking state for consecutive lookups
      }
    } else if (session.state === 'OTHER_HELP') {
      if (/^(cancel|menu|0|exit|quit|hi|hello|namaste)$/i.test(userLower)) {
        resetSession(phone);
        replyText = MENU_TEXT;
      } else {
        replyText = handleOtherHelp(messageText, false);
      }
    } else {
      // MENU state — determine intent
      let intent = await detectIntent(history, messageText);

      switch (intent) {
        case 'GREETING':
          resetSession(phone);
          replyText = MENU_TEXT;
          break;

        case 'REGISTER_COMPLAINT':
          session.state = 'REGISTERING';
          session.draft = {};
          replyText = "Theek hai, chaliye aapki complaint register karte hain.\n\nAapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.";
          break;

        case 'CHECK_STATUS':
          session.state = 'CHECKING_STATUS';
          replyText = "Ji, kripya apna Complaint ID bhejiye.";
          break;

        case 'OTHER_HELP':
          session.state = 'OTHER_HELP';
          replyText = handleOtherHelp(messageText, true);
          break;

        default:
          replyText = "Maaf karna, mujhe theek se samajh nahi aaya.\n\n" + MENU_TEXT;
          break;
      }
    }

    // ── Send reply ──
    if (replyText) {
      try {
        const { messageId } = await whatsappService.sendTextMessage(phone, replyText);

        // Store outbound message
        await WhatsAppMessage.create({
          phone,
          direction: 'outbound',
          content: replyText,
          messageType: 'text',
          waMessageId: messageId || undefined,
          status: 'sent'
        });
      } catch (sendErr) {
        console.error('[WhatsApp] Failed to send reply:', sendErr.message);
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Unhandled error in conversation handler:', err);
    // Try to send error message — don't let main backend crash
    try {
      await whatsappService.sendTextMessage(phone, "Sorry, abhi technical problem aa rahi hai. Thodi der mein try karein.");
    } catch (e) {
      // Completely swallow — never crash
    }
  }
}

/**
 * Handle incoming media messages (image/video/document).
 * Downloads the media and stores it as evidence if the citizen is mid-registration.
 *
 * @param {string} phone
 * @param {object} mediaInfo - { id, mimeType, caption, type }
 * @param {string} [waMessageId]
 */
async function handleIncomingMedia(phone, mediaInfo, waMessageId) {
  try {
    // Store the message record
    await WhatsAppMessage.create({
      phone,
      direction: 'inbound',
      content: mediaInfo.caption || `[${mediaInfo.type}]`,
      messageType: mediaInfo.type,
      mediaUrl: mediaInfo.id, // Store Meta media ID for later resolution
      mediaType: mediaInfo.mimeType,
      waMessageId: waMessageId || undefined,
      status: 'received'
    });

    // Try to download and save the media file
    const session = getSession(phone);
    if (session.state === 'REGISTERING') {
      try {
        const { url, mimeType } = await whatsappService.getMediaUrl(mediaInfo.id);
        const { buffer, contentType } = await whatsappService.downloadMedia(url);

        // Save to uploads directory
        const path = require('path');
        const fs = require('fs');
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const ext = contentType.split('/')[1] || 'bin';
        const filename = `whatsapp-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);

        // Store the path for evidence attachment
        if (!session.draft.evidence) session.draft.evidence = [];
        session.draft.evidence.push(`/uploads/${filename}`);

        const { messageId } = await whatsappService.sendTextMessage(phone, 
          `✅ ${mediaInfo.type === 'image' ? 'Photo' : mediaInfo.type === 'video' ? 'Video' : 'Document'} mil gaya. Evidence ke roop mein complaint mein add ho jayega.\n\nAur kuch bhejein ya baat jaari rakhein.`
        );

        await WhatsAppMessage.create({
          phone,
          direction: 'outbound',
          content: 'Evidence received confirmation',
          messageType: 'text',
          waMessageId: messageId || undefined,
          status: 'sent'
        });
      } catch (mediaErr) {
        console.error('[WhatsApp] Media download error:', mediaErr.message);
        await whatsappService.sendTextMessage(phone, "Media file receive hua, lekin save karne mein problem aayi. Complaint text se jaari rakhein.");
      }
    } else {
      // Not in registration — acknowledge and suggest registering
      const replyText = `Media mil gaya 👍\n\nComplaint register karne ke liye 'hi' bhejein aur Option 1 choose karein. Complaint ke dauran aap photo/video evidence bhej sakte hain.`;
      const { messageId } = await whatsappService.sendTextMessage(phone, replyText);
      await WhatsAppMessage.create({
        phone,
        direction: 'outbound',
        content: replyText,
        messageType: 'text',
        waMessageId: messageId || undefined,
        status: 'sent'
      });
    }
  } catch (err) {
    console.error('[WhatsApp] Media handling error:', err);
  }
}

module.exports = {
  handleIncomingMessage,
  handleIncomingMedia,
  getSession,
  resetSession,
  MENU_TEXT
};
