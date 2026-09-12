require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY;

const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const payload = {
  contents: [
    { role: 'user', parts: [{ text: "Hi" }] },
    { role: 'model', parts: [{ text: "1. Register Complaint\n2. Check Complaint Status\n3. Other Help" }] },
    { role: 'user', parts: [{ text: "1" }] },
    { role: 'model', parts: [{ text: "What type of issue are you facing (e.g., Water, Electricity, Roads, Sanitation)?" }] },
    { role: 'user', parts: [{ text: "In my area drinking water's problem" }] }
  ],
  systemInstruction: { parts: [{ text: "Extract the complaint draft from the conversation.\nJSON Schema:\n{\n  \"citizenName\": \"string or omit\"\n}" }] },
  generationConfig: { temperature: 0.1 }
};

fetch(`${endpoint}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}).catch(console.error);
