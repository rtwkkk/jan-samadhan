require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY;

const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const payload = {
  contents: [
    { role: 'user', parts: [{ text: "hi" }] },
    { role: 'model', parts: [{ text: "1. Register Complaint" }] },
    { role: 'user', parts: [{ text: "1" }] }
  ],
  systemInstruction: { parts: [{ text: "Extract the complaint draft from the conversation." }] },
  generationConfig: { temperature: 0.1 }
};

fetch(`${endpoint}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log("Status NO JSON:", res.status);
}).catch(console.error);

const payloadJson = JSON.parse(JSON.stringify(payload));
payloadJson.generationConfig.responseMimeType = 'application/json';

fetch(`${endpoint}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payloadJson)
}).then(async res => {
  console.log("Status WITH JSON:", res.status);
}).catch(console.error);
