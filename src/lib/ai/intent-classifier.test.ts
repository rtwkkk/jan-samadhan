import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectIntent } from './intent-classifier';
import { AIProvider, ChatMessage } from './provider';

describe('detectIntent', () => {
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = {
      generateReply: vi.fn(),
      generateStructuredData: vi.fn(),
    };
  });

  it('C. Natural language: "Hamare gaon mein paani nahi aa raha" -> complaint intent', async () => {
    vi.mocked(mockProvider.generateReply).mockResolvedValueOnce('REGISTER_COMPLAINT');
    
    const intent = await detectIntent(mockProvider, [], 'Hamare gaon mein paani nahi aa raha');
    
    expect(intent).toBe('REGISTER_COMPLAINT');
    expect(mockProvider.generateReply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining('paani nahi aa raha') })
      ])
    );
  });

  it('C. Natural language: "meri complaint ka status batao" -> status intent', async () => {
    vi.mocked(mockProvider.generateReply).mockResolvedValueOnce('CHECK_STATUS');
    const intent = await detectIntent(mockProvider, [], 'meri complaint ka status batao');
    expect(intent).toBe('CHECK_STATUS');
  });

  it('returns UNKNOWN for unrelated queries', async () => {
    vi.mocked(mockProvider.generateReply).mockResolvedValueOnce('UNKNOWN');
    const intent = await detectIntent(mockProvider, [], 'what is the weather?');
    expect(intent).toBe('UNKNOWN');
  });

  it('returns null on AI failure', async () => {
    vi.mocked(mockProvider.generateReply).mockResolvedValueOnce(null);
    const intent = await detectIntent(mockProvider, [], 'hello');
    expect(intent).toBeNull();
  });
});
