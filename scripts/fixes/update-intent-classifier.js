const fs = require('fs');
const file = 'src/lib/ai/intent-classifier.ts';
let code = fs.readFileSync(file, 'utf8');

const oldPrompt = `    content: \`You are a strict intent classifier for a WhatsApp bot.
Available options:
1. Register Complaint
2. Check Complaint Status
3. Other Help

Classify the user's latest message into EXACTLY ONE of these categories. Return ONLY the category name.

Categories:
GREETING (user says hi, hello, start, menu, hey)
REGISTER_COMPLAINT (user says 1, register complaint, report a problem, etc.)
CHECK_STATUS (user says 2, check status, track complaint, etc.)
OTHER_HELP (user says 3, other, need help, etc.)
UNKNOWN (unrelated, ambiguous, or gibberish)

User's latest message: "\${userMessage}"\``;

const newPrompt = `    content: \`You are a strict intent classifier for a citizen WhatsApp bot in India.
The citizens speak simple Hindi, Hinglish, or English.
Classify the user's latest message into EXACTLY ONE of these categories. Return ONLY the category name. DO NOT generate a conversational response.

Categories:
GREETING (e.g., hi, hello, namaste, start, hey)
REGISTER_COMPLAINT (e.g., paani nahi aa raha, road toot gayi hai, bijli kharab hai, report a problem, register complaint, 1)
CHECK_STATUS (e.g., meri complaint ka kya hua, status batao, track complaint, 2)
OTHER_HELP (e.g., mujhe madad chahiye, other, 3)
UNKNOWN (unrelated, ambiguous)

User's latest message: "\${userMessage}"\``;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync(file, code);
