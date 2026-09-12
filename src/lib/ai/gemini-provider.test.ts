import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from './gemini-provider';

// Mock global fetch
const originalFetch = global.fetch;

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    provider = new GeminiProvider();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  });

  it('handles missing API key safely', async () => {
    delete process.env.GEMINI_API_KEY;
    provider = new GeminiProvider();
    
    const reply = await provider.generateReply([{ role: 'user', content: 'hi' }]);
    expect(reply).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('formats payload correctly and returns generated text', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello from AI' }] } }]
      })
    } as any);

    const reply = await provider.generateReply([
      { role: 'system', content: 'You are an assistant' },
      { role: 'user', content: 'Hi there' }
    ]);

    expect(reply).toBe('Hello from AI');
    
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    expect(fetchCall[0]).toContain('key=test-key');
    
    const payload = JSON.parse(fetchCall[1]?.body as string);
    expect(payload.systemInstruction.parts[0].text).toBe('You are an assistant');
    expect(payload.contents[0].role).toBe('user');
    expect(payload.contents[0].parts[0].text).toBe('Hi there');
  });

  it('handles JSON generation for raw JSON response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"foo":"bar"}' }] } }]
      })
    } as any);

    const data = await provider.generateStructuredData<{foo: string}>([
      { role: 'user', content: 'Extract json' }
    ]);

    expect(data?.foo).toBe('bar');
    
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(fetchCall[1]?.body as string);
    // ensure MIME type is NOT sent for 3.8-flash compatibility
    expect(payload.generationConfig?.responseMimeType).toBeUndefined();
  });

  it('handles JSON generation for fenced ```json response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '```json\n{"foo":"fenced"}\n```' }] } }]
      })
    } as any);

    const data = await provider.generateStructuredData<{foo: string}>([
      { role: 'user', content: 'Extract json' }
    ]);

    expect(data?.foo).toBe('fenced');
  });

  it('handles non-2xx responses gracefully for generateReply', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    } as any);

    const reply = await provider.generateReply([{ role: 'user', content: 'hi' }]);
    expect(reply).toBeNull();
  });

  it('handles non-2xx responses gracefully for generateStructuredData', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'High demand'
    } as any);

    const data = await provider.generateStructuredData([{ role: 'user', content: 'hi' }]);
    expect(data).toBeNull();
  });

  it('handles fetch exceptions gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network failure'));

    const reply = await provider.generateReply([{ role: 'user', content: 'hi' }]);
    expect(reply).toBeNull();
  });
});
