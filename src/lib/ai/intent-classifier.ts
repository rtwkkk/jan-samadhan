import { AIProvider, ChatMessage } from './provider';

export type WhatsAppIntent =
  | 'GREETING'
  | 'REGISTER_COMPLAINT'
  | 'CHECK_STATUS'
  | 'OTHER_HELP'
  | 'UNKNOWN';

export async function detectIntent(
  provider: AIProvider,
  history: ChatMessage[],
  userMessage: string
): Promise<WhatsAppIntent | null> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are a strict intent classifier for a citizen WhatsApp bot in India.
The citizens speak simple Hindi, Hinglish, or English.
Classify the user's latest message into EXACTLY ONE of these categories. Return ONLY the category name. DO NOT generate a conversational response.

Categories:
GREETING (e.g., hi, hello, namaste, start, hey)
REGISTER_COMPLAINT (e.g., paani nahi aa raha, road toot gayi hai, bijli kharab hai, report a problem, register complaint, 1)
CHECK_STATUS (e.g., meri complaint ka kya hua, status batao, track complaint, 2)
OTHER_HELP (e.g., mujhe madad chahiye, other, 3)
UNKNOWN (unrelated, ambiguous)

User's latest message: "${userMessage}"`
  };

  // We only need a short history for context to understand things like "1"
  const recentHistory = history.slice(-5);
  
  const response = await provider.generateReply([...recentHistory, systemPrompt]);
  if (response === null) return null; // AI failure
  const cleanResponse = response.trim().toUpperCase();

  if (cleanResponse.includes('REGISTER_COMPLAINT')) return 'REGISTER_COMPLAINT';
  if (cleanResponse.includes('CHECK_STATUS')) return 'CHECK_STATUS';
  if (cleanResponse.includes('OTHER_HELP')) return 'OTHER_HELP';
  if (cleanResponse.includes('GREETING')) return 'GREETING';

  return 'UNKNOWN';
}
