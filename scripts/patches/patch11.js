const fs = require('fs');
const file = 'src/lib/ai/intent-classifier.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `export async function detectIntent(
  provider: AIProvider,
  history: ChatMessage[],
  userMessage: string
): Promise<WhatsAppIntent> {`,
  `export async function detectIntent(
  provider: AIProvider,
  history: ChatMessage[],
  userMessage: string
): Promise<WhatsAppIntent | null> {`
);

code = code.replace(
  `  const response = await provider.generateReply([...recentHistory, systemPrompt]);
  const cleanResponse = response?.trim().toUpperCase() || 'UNKNOWN';`,
  `  const response = await provider.generateReply([...recentHistory, systemPrompt]);
  if (response === null) return null; // AI failure
  const cleanResponse = response.trim().toUpperCase();`
);

fs.writeFileSync(file, code);
