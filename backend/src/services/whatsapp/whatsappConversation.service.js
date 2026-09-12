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

// ── Gemini AI Helper ──

/**
 * Call Gemini API for AI-powered responses.
 * @param {Array<{role: string, content: string}>} messages
 * @param {boolean} [isJson=false]
 * @returns {Promise<string|null>}
 */
async function callGeminiAI(messages, isJson = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[WhatsApp AI] GEMINI_API_KEY not configured, using deterministic responses');
    return null;
  }

  let systemInstruction;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }

  const generationConfig = {
    temperature: 0.3,
    maxOutputTokens: 1024,
  };

  if (isJson) {
    generationConfig.responseMimeType = "application/json";
  }

  try {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      system_instruction: systemInstruction,
      contents,
      generationConfig
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (error) {
    console.error('[WhatsApp AI] Gemini API error:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Call Gemini API and parse JSON response.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<Object|null>}
 */
async function callGeminiJSON(messages) {
  const raw = await callGeminiAI(messages, true);
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
REGISTER_COMPLAINT (e.g., paani, bijli, sadak, education, health, pension, garbage, safety, report a problem, 1)
CHECK_STATUS (e.g., meri complaint ka kya hua, status batao, track complaint, 2)
OTHER_HELP (e.g., mujhe madad chahiye, other, 3)
OUT_OF_SCOPE (e.g., jokes, songs, personal chat, unrelated topics)
UNKNOWN (unrelated, ambiguous)

User's latest message: "${userMessage}"`
  };

  const recentHistory = history.slice(-5);
  const response = await callGeminiAI([...recentHistory, systemPrompt]);

  if (!response) return 'UNKNOWN';
  const clean = response.toUpperCase();

  if (clean.includes('REGISTER_COMPLAINT')) return 'REGISTER_COMPLAINT';
  if (clean.includes('CHECK_STATUS')) return 'CHECK_STATUS';
  if (clean.includes('OTHER_HELP')) return 'OTHER_HELP';
  if (clean.includes('GREETING')) return 'GREETING';
  if (clean.includes('OUT_OF_SCOPE')) return 'OUT_OF_SCOPE';
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
1. CITIZEN-FRIENDLY & PROFESSIONAL LANGUAGE: Use simple, polite, everyday Hindi/Hinglish. Sound professional, warm, and natural. Do NOT append 'ji' after the citizen's name or in responses (e.g. avoid 'Sorry ji', 'Achha ji', 'Name ji').
2. ONE QUESTION AT A TIME: Never dump multiple questions. Determine ONE missing required field and ask for it.
3. VAGUE INPUT & MULTIPLE ISSUES: If input is vague ("bohot problem hai"), ask ONE clarifying question. If they mention multiple issues, ask which one to register first. Accept ANY societal, public, or civic issue (e.g. water, electricity, roads, education, healthcare, social welfare, environment, crime, corruption).
4. CONFIRMATION: When ALL required fields (citizenName, complaintType, description, district, villageCityBlock, peopleAffected, locationLat, locationLng) AND evidence availability are known, write a short conversational summary and ask for explicit confirmation.

Rules for extraction:
- Retain ALL previously extracted information in the JSON output. Do NOT drop fields (like citizenName) that were provided earlier in the conversation.
- Infer 'department' (e.g., Water Supply, Electricity, Public Works, Sanitation, Health, Education, Police, Social Welfare) based on their own words.
- Infer 'priority' (Low, Medium, High, Critical) from duration/severity.
- If the user shares a location (e.g. 📍 Location: ...), extract the latitude and longitude into 'locationLat' and 'locationLng'.
- If they explicitly confirm the summary (e.g., "haan", "yes", "sahi hai", "kar do", "ji haan"), set "isConfirmed": true.
- If they cancel or correct during confirmation (e.g., "nahi", "galat hai", "change karna hai"), set "isConfirmed": false.

Output valid JSON ONLY. Do NOT wrap it in markdown. Do NOT add any extra text.

JSON Schema:
{
  "citizenName": "string",
  "complaintType": "string",
  "description": "string",
  "district": "string",
  "villageCityBlock": "string",
  "locationLat": 28.123,
  "locationLng": 77.123,
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

  const draft = await callGeminiJSON([...history, extractionPrompt]);

  if (!draft) {
    return "Sorry, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye.";
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
  if (typeof draft.peopleAffected !== 'number' || draft.peopleAffected < 1) missingFields.push('peopleAffected');
  if (typeof draft.locationLat !== 'number' || typeof draft.locationLng !== 'number') missingFields.push('location');

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
        'villageCityBlock': "Aapke gaon, city ya block ka naam kya hai?",
        'peopleAffected': "Is problem se lagbhag kitne log pareshan hain?",
        'location': "Kripya apni exact location WhatsApp par share karein (Location attachment bhej kar)."
      };
      if (missingFields[0] === 'location') {
        return { isLocationRequest: true, text: "Kripya niche diye gaye 'Send Location' button par click karke apni exact location (GPS) share karein." };
      }
      return draft.nextMessageToCitizen || fieldQuestions[missingFields[0]];
    }

    // All required fields present but not confirmed — ask for evidence or confirmation
    if (draft.evidenceAvailable === undefined) {
      return draft.nextMessageToCitizen || "Aapke paas iski koi photo ya video hai? Agar photo nahi bhejenge toh complaint low priority mein daali ja sakti hai. (Haan/Nahi)";
    }

    // Deterministic Summary Fallback
    let summary = "Complaint register karne se pehle ek baar details check kar lete hain:\n\n";
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
      department: draft.department || 'Other',
      urgencySeverity: urgency,
      district: draft.district,
      villageCityBlock: draft.villageCityBlock,
      latitude: draft.locationLat,
      longitude: draft.locationLng,
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
async function handleStatusCheck(userMessage, baseUrl) {
  // Try to extract a MongoDB ObjectId or any ID-like pattern
  const objectIdMatch = userMessage.match(/[0-9a-fA-F]{24}/);
  const idMatch = objectIdMatch ? objectIdMatch[0] : null;

  if (!idMatch) {
    return "Kripya apna Complaint ID bhejiye. Aapki complaint register hone par jo ID mili thi woh bhejein.";
  }

  try {
    const challenge = await Challenge.findById(idMatch);

    if (!challenge) {
      return "Is Complaint ID se koi complaint nahi mili. Kripya Complaint ID check karke dobara bhejiye.";
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
    response += `*Status:* ${readableStatus}\n\n`;

    let progressUrl = null;
    const validStatuses = ['submitted', 'under_review', 'information_requested', 'verified', 'assigned', 'in_progress', 'resolved'];
    if (validStatuses.includes(challenge.status)) {
      progressUrl = `${baseUrl}/uploads/progress-${challenge.status}.png`;
    }

    response += `*Department:* ${challenge.department || 'Other'}\n`;
    response += `*District:* ${challenge.district}\n`;
    response += `*Priority:* ${challenge.urgencySeverity}\n`;

    if (challenge.assignment?.institution_name) {
      response += `*Assigned To:* ${challenge.assignment.institution_name}\n`;
    }

    response += `\nDoosri complaint ka status check karne ke liye ID bhejein, ya menu ke liye 'hi' type karein.`;
    return progressUrl ? { text: response, mediaUrl: progressUrl } : response;
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
 * @param {string} [baseUrl] - Webhook server base URL for image generation
 * @returns {Promise<void>}
 */
async function handleIncomingMessage(phone, messageText, waMessageId, baseUrl) {
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
    let mediaResult = null;

    // ── Route based on session state ──
    if (session.state === 'REGISTERING') {
      // Check for cancellation / menu return
      if (/^(cancel|menu|0|exit|quit)$/i.test(userLower)) {
        resetSession(phone);
        replyText = "Complaint registration cancel ho gayi.\n\n" + MENU_TEXT;
      } else {
        const regResult = await handleComplaintRegistration(phone, history);
        if (typeof regResult === 'object') {
          replyText = regResult.text;
          mediaResult = regResult;
        } else {
          replyText = regResult;
        }
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
        const statusResult = await handleStatusCheck(messageText, baseUrl);
        if (typeof statusResult === 'string') {
          replyText = statusResult;
        } else {
          replyText = statusResult.text;
          mediaResult = statusResult;
        }
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
          replyText = "Kripya apna Complaint ID bhejiye.";
          break;

        case 'OTHER_HELP':
          session.state = 'OTHER_HELP';
          replyText = handleOtherHelp(messageText, true);
          break;

        case 'OUT_OF_SCOPE':
          replyText = "Maaf kijiye, main sirf Jan Samadhan portal se judi shikayaton aur jaankari ke liye hoon. Main is baare mein madad nahi kar sakta.";
          break;

        default:
          replyText = "Maaf karna, mujhe theek se samajh nahi aaya.\n\n" + MENU_TEXT;
          break;
      }
    }

    // ── Send reply ──
    if (replyText) {
      try {
        let messageId;
        if (mediaResult && mediaResult.mediaUrl) {
          const res = await whatsappService.sendMediaMessage(phone, 'image', mediaResult.mediaUrl, replyText);
          messageId = res.messageId;
        } else if (mediaResult && mediaResult.isLocationRequest) {
          const res = await whatsappService.sendLocationRequestMessage(phone, replyText);
          messageId = res.messageId;
        } else {
          const res = await whatsappService.sendTextMessage(phone, replyText);
          messageId = res.messageId;
        }

        // Store outbound message
        await WhatsAppMessage.create({
          phone,
          direction: 'outbound',
          content: replyText,
          messageType: mediaResult ? 'image' : 'text',
          mediaUrl: mediaResult ? mediaResult.mediaUrl : undefined,
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

/**
 * Handoff from a completed Sarvam Voice Call directly into the WhatsApp CRM.
 * Injects the collected details into the CRM memory and sends a location request template.
 * @param {string} phone 
 * @param {Object} callDetails 
 */
async function initializeVoiceCallHandoff(phone, callDetails) {
  try {
    // Force reset session to start fresh in REGISTERING state
    resetSession(phone);
    const session = getSession(phone);
    session.state = 'REGISTERING';
    
    // Inject memory from the voice call
    session.draft = {
      citizenName: callDetails.userName || '',
      complaintType: 'Other', // General default, AI will refine later if needed
      description: callDetails.callSummary || 'No description provided',
      district: '',
      villageCityBlock: '',
      // We keep location empty so the CRM asks for it
      peopleAffected: 1, // Assume 1 to skip asking for it unless AI decides otherwise
    };

    // Construct the professional template message
    const messageText = `Namaskar ${callDetails.userName ? callDetails.userName + ' ' : ''}! 🙏\nThank you for speaking with Jagriti on the Jan Samadhan Support Line.\n\nWe have successfully recorded your concern:\n🔹 Name: ${callDetails.userName || 'Citizen'}\n🔹 Phone: ${phone}\n🔹 Problem Summary: ${callDetails.callSummary || 'Not specified'}\n\nTo proceed with resolving your issue, we require your exact live location and any supporting photos/videos of the problem.\n\nPlease tap the 'Send Location' button below to share your GPS coordinates.`;

    // Send WhatsApp location request
    const { messageId } = await whatsappService.sendLocationRequestMessage(phone, messageText);

    // Log the outbound message to the database
    await WhatsAppMessage.create({
      phone,
      direction: 'outbound',
      content: messageText,
      messageType: 'interactive',
      waMessageId: messageId || undefined,
      status: 'sent'
    });

    console.log(`[WhatsApp CRM] Successfully initialized voice call handoff for ${phone}`);
  } catch (error) {
    console.error(`[WhatsApp CRM] Failed to initialize voice call handoff for ${phone}:`, error.message);
  }
}

module.exports = {
  handleIncomingMessage,
  handleIncomingMedia,
  getSession,
  resetSession,
  initializeVoiceCallHandoff,
  MENU_TEXT
};
