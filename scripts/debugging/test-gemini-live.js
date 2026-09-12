require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GEMINI_API_KEY;

const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

const payload = {
  contents: [
    {
      role: 'user',
      parts: [{ text: "hi" }]
    },
    {
      role: 'model',
      parts: [{ text: "1. Register Complaint\n2. Check Complaint Status\n3. Other Help" }]
    },
    {
      role: 'user',
      parts: [{ text: "1" }]
    }
  ],
  systemInstruction: {
    parts: [{ text: "Extract the complaint draft from the conversation." }]
  },
  generationConfig: {
    temperature: 0.1,
    responseMimeType: 'application/json',
    responseSchema: {
      type: "OBJECT",
      properties: {
        citizenName: { type: "STRING" }
      }
    }
  }
};

fetch(`${endpoint}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log("Status with json and schema:", res.status);
  console.log("Response:", await res.text());
}).catch(console.error);
