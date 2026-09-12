import { AIProvider } from './provider';
import { GeminiProvider } from './gemini-provider';
import { GroqProvider } from './groq-provider';

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  
  if (provider === 'groq') {
    return new GroqProvider();
  }
  
  // Default to Gemini as per existing behavior and instructions
  return new GeminiProvider();
}
