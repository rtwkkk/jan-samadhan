import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqProvider } from './groq-provider';

describe('GroqProvider', () => {
  let provider: GroqProvider;
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    provider = new GroqProvider();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it('handles missing API key safely', async () => {
    delete process.env.GROQ_API_KEY;
    const noKeyProvider = new GroqProvider();
    
    const reply = await noKeyProvider.generateReply([{ role: 'user', content: 'hello' }]);
    expect(reply).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('generateReply extracts content successfully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello from groq' } }]
      })
    } as any);

    const reply = await provider.generateReply([{ role: 'user', content: 'hello' }]);
    expect(reply).toBe('hello from groq');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.groq.com/openai/v1/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: expect.stringContaining('"model":"openai/gpt-oss-120b"')
      })
    );
  });

  it('generateStructuredData requests json_object and parses successfully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"status": "ok"}' } }]
      })
    } as any);

    const data = await provider.generateStructuredData<{status: string}>([{ role: 'user', content: 'test' }]);
    expect(data).toEqual({ status: 'ok' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('"response_format":{"type":"json_object"}')
      })
    );
  });

  it('generateStructuredData cleans markdown fenced json', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"status": "fenced"}\n```' } }]
      })
    } as any);

    const data = await provider.generateStructuredData<{status: string}>([{ role: 'user', content: 'test' }]);
    expect(data).toEqual({ status: 'fenced' });
  });

  it('handles non-2xx responses gracefully for generateReply', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as any);

    const reply = await provider.generateReply([{ role: 'user', content: 'test' }]);
    expect(reply).toBeNull();
  });

  it('handles fetch exceptions gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network failure'));

    const reply = await provider.generateReply([{ role: 'user', content: 'test' }]);
    expect(reply).toBeNull();
  });
});
