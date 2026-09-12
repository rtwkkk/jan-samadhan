const fs = require('fs');
const file = 'src/lib/ai/complaint-registration-flow.ts';
let code = fs.readFileSync(file, 'utf8');

// The prompt
const oldPrompt = `    content: \`You are an AI that extracts complaint registration details from a conversation.
Required fields: citizenName, complaintType, description, district, villageCityBlock.
Optional fields: email, location, peopleAffected.

Read the conversation history. The assistant has been asking questions and the user answering.
Extract the current state of the complaint draft as a JSON object.

Rules:
- DO NOT hallucinate. Only extract what the user has explicitly stated.
- If the assistant asked for confirmation and the user agreed (e.g. "yes", "confirm"), set "isConfirmed": true.
- If the user explicitly canceled or said no during confirmation, set "isCanceled": true.
- If the user provided multiple pieces of info in one message, extract all of them.

Output valid JSON ONLY. Only include fields that were provided or confidently inferred.

JSON Schema:
{
  "citizenName": "string (e.g. Rahul Kumar)",
  "complaintType": "string (e.g. Water Supply, Electricity)",
  "description": "string",
  "district": "string",
  "villageCityBlock": "string",
  "location": "string (exact location if provided)",
  "peopleAffected": 50,
  "evidenceAvailable": false,
  "isConfirmed": false,
  "isCanceled": false,
  "department": "string (infer from complaint: Water Supply, Roads/Public Works, Electricity, Municipal/Sanitation)",
  "priority": "string (infer: low, medium, high, urgent)"
}\``;

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
- If they confirm the summary (e.g., "haan", "yes", "sahi hai", "theek hai", "kar do"), set "isConfirmed": true.
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
}\``;

code = code.replace(oldPrompt, newPrompt);

// The logic
const oldLogic = `  if (missingFields.length > 0) {
    // Ask for the first missing field
    const nextField = missingFields[0];
    const fieldQuestions: Record<string, string> = {
      'name': "Achha 👍 Aapka full name kya hai?",
      'complaint type (e.g., water, electricity, roads)': "Aapko kis cheez ki problem hai? Jaise paani, bijli, sadak, safai etc.",
      'detailed description of the issue': "Theek hai 👍 Problem kya hai, thoda bataiye.",
      'district': "Ye problem kis district mein hai?",
      'village, city, or block': "Aapke gaon, city ya block ka naam kya hai?",
      'evidence': "Aapke paas iski koi photo ya video hai?"
    };
    return fieldQuestions[nextField] || \`Please provide your \${nextField}.\`;
  }

  if (!draft.isConfirmed) {
    // Summarize and ask for confirmation
    let summary = "Achha, complaint register karne se pehle ek baar details check kar lete hain:\\n\\n";
    summary += \`Name: \${draft.citizenName}\\n\`;
    summary += \`Type: \${draft.complaintType}\\n\`;
    summary += \`Description: \${draft.description}\\n\`;
    summary += \`District: \${draft.district}\\n\`;
    summary += \`Village/City: \${draft.villageCityBlock}\\n\`;
    if (draft.email) summary += \`Email: \${draft.email}\\n\`;
    if (draft.location) summary += \`Location: \${draft.location}\\n\`;
    if (draft.peopleAffected) summary += \`People Affected: \${draft.peopleAffected}\\n\`;
    if (draft.evidenceAvailable) summary += \`Evidence: Yes\\n\`;
    summary += "\\nSab sahi hai? Haan/Yes ya Nahi/No bataiye.";
    
    return summary;
  }`;

const newLogic = `  // Prevent premature confirmation if fields are genuinely missing
  if (draft.isConfirmed && missingFields.length > 0) {
    draft.isConfirmed = false;
  }

  if (!draft.isConfirmed) {
    return draft.nextMessageToCitizen || "Achha, thoda aur detail bataiye.";
  }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(file, code);
