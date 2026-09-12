const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update ComplaintDraft type
code = code.replace(
  `  evidenceAvailable?: boolean;`,
  `  evidenceAvailable?: boolean;\n  nextMessageToCitizen?: string;`
);

// 2. Update the system prompt completely
const oldPromptStart = `    content: \`You are an AI that extracts complaint registration details from a conversation.`;
const oldPromptEnd = `  "priority": "string (infer: low, medium, high, urgent)"\n}\``;

const fullOldPromptMatch = new RegExp(oldPromptStart.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '.*?' + oldPromptEnd.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 's');

const newPrompt = `    content: \`You are a helpful WhatsApp assistant for citizens in India.
Your job is to read the conversation, extract the complaint details, and formulate the NEXT natural response to the citizen.

Rules for conversation (nextMessageToCitizen):
1. CITIZEN-FRIENDLY LANGUAGE: Use simple everyday Hindi/Hinglish (e.g., "Achha, samajh gaya", "Aapko kis cheez ki problem hai?", "Ye problem kis district mein hai?"). Do not sound like a formal government form.
2. ONE QUESTION AT A TIME: Never dump multiple questions. If they gave multiple details, extract them all and ask for ONE missing thing.
3. VAGUE INPUT & MULTIPLE ISSUES: If input is vague ("road kharab hai"), ask ONE clarifying question. If they mention multiple issues, ask which one to register first.
4. CONFIRMATION: When ALL required fields (citizenName, complaintType, description, district, villageCityBlock) AND evidence availability are known, write a short conversational summary and ask for confirmation. 
   Example: "Achha ji, ek baar details check kar lete hain. Aapke gaon Rampur mein 5 din se paani nahi aa raha hai. Sab sahi hai? Haan ya Nahi bataiye."
5. CORRECTIONS: If they correct a detail, update the JSON field and acknowledge it naturally without restarting.

Rules for extraction:
- Infer 'department' (e.g., Water Supply, Electricity, Roads/Public Works, Municipal/Sanitation) based on their own words.
- Infer 'priority' (low, medium, high, urgent) from duration/severity.
- If they confirm the summary (e.g., "haan", "yes", "sahi hai"), set "isConfirmed": true.
- If they cancel, set "isCanceled": true.

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
}\``;

code = code.replace(fullOldPromptMatch, newPrompt);

// 3. Update error fallback
code = code.replace(
  `return "Maaf karna, abhi kuch technical problem hai. Thodi der mein try karein.";`,
  `return "Sorry ji, abhi thodi technical problem aa rahi hai. Ek baar phir se bataiye.";`
);

// 4. Remove the hardcoded field checking and summary logic, but keep the safety check
const startHardcode = `  if (missingFields.length > 0) {`;
const endHardcode = `    return summary;\n  }`;
const hardcodeRegex = new RegExp(startHardcode.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\$&') + '.*?' + endHardcode.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\$&'), 's');

const newLogic = `  // Prevent premature confirmation
  if (draft.isConfirmed && missingFields.length > 0) {
    draft.isConfirmed = false;
  }

  if (!draft.isConfirmed) {
    return draft.nextMessageToCitizen || "Achha, thoda aur detail bataiye.";
  }`;

code = code.replace(hardcodeRegex, newLogic);

fs.writeFileSync(file, code);
