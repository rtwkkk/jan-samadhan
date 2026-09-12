import { AIProvider, ChatMessage } from './provider';

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  private buildPayload(messages: ChatMessage[], isJson: boolean) {
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const chatHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const payload: any = {
      contents: chatHistory,
      generationConfig: {
        temperature: 0.1, // Lower temperature for structured/predictable tasks
        maxOutputTokens: 1024,
      }
    };

    // Removed responseMimeType: 'application/json' for gemini-3.8-flash compatibility

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    return payload;
  }

  async generateReply(messages: ChatMessage[]): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('[GeminiProvider] GEMINI_API_KEY is missing. Add it to your environment variables.');
      return null;
    }

    const payload = this.buildPayload(messages, false);

    try {
      const res = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[GeminiProvider] Error response (${res.status}):`, errorText);
        return null;
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply || null;
    } catch (err) {
      console.error('[GeminiProvider] Network or parsing error:', err);
      return null;
    }
  }

  async generateStructuredData<T>(messages: ChatMessage[]): Promise<T | null> {
    if (!this.apiKey) return null;

    const payload = this.buildPayload(messages, true);

    try {
      const res = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[GeminiProvider] Structured JSON error response (${res.status}):`, errorText);
        return null;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      // Clean markdown fencing from JSON string
      const cleanedText = text
        .replace(/^```(?:json)?/im, '')
        .replace(/```$/im, '')
        .trim();

      return JSON.parse(cleanedText) as T;
    } catch (err) {
      console.error('[GeminiProvider] Network or parsing error for JSON:', err);
      return null;
    }
  }
}
