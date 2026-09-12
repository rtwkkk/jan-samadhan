import { AIProvider, ChatMessage } from './provider';

export class GroqProvider implements AIProvider {
  private apiKey: string;
  private endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private model = 'openai/gpt-oss-120b';

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  private buildPayload(messages: ChatMessage[], isJson: boolean) {
    const payload: any = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.1,
      max_tokens: 1024,
    };

    if (isJson) {
      payload.response_format = { type: 'json_object' };
    }

    return payload;
  }

  async generateReply(messages: ChatMessage[]): Promise<string | null> {
    if (!this.apiKey) {
      console.error('[GroqProvider] GROQ_API_KEY is missing. Add it to your environment variables.');
      return null;
    }

    try {
      const payload = this.buildPayload(messages, false);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[GroqProvider] Error response (${res.status}):`, errorText);
        return null;
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error('[GroqProvider] Network error:', err);
      return null;
    }
  }

  async generateStructuredData<T>(messages: ChatMessage[]): Promise<T | null> {
    if (!this.apiKey) {
      console.error('[GroqProvider] GROQ_API_KEY is missing. Add it to your environment variables.');
      return null;
    }

    try {
      const payload = this.buildPayload(messages, true);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[GroqProvider] Structured JSON error response (${res.status}):`, errorText);
        return null;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) return null;

      // Clean markdown fencing from JSON string (Groq may still sometimes wrap it)
      const cleanedText = text
        .replace(/^```(?:json)?/im, '')
        .replace(/```$/im, '')
        .trim();

      return JSON.parse(cleanedText) as T;
    } catch (err) {
      console.error('[GroqProvider] Network or parsing error for JSON:', err);
      return null;
    }
  }
}
