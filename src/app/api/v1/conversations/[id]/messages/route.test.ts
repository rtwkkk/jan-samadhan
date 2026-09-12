import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import { MessageRepository } from '@/lib/mongodb/repositories/MessageRepository';
import { requireApiAuth } from '@/lib/auth/api-context';

vi.mock('@/lib/auth/api-context');
vi.mock('@/lib/mongodb/models/Conversation');
vi.mock('@/lib/mongodb/repositories/MessageRepository');
vi.mock('@/lib/mongodb/client', () => ({ connectToDatabase: vi.fn() }));

describe('GET /api/v1/conversations/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with messages', async () => {
    vi.mocked(requireApiAuth).mockResolvedValue({ accountId: 'acc-1' } as any);
    
    vi.mocked(Conversation.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'conv-1', accountId: 'acc-1' })
    } as any);

    vi.mocked(MessageRepository.findManyWithCursor).mockResolvedValue([
      {
        _id: 'msg-1',
        accountId: 'acc-1',
        conversationId: 'conv-1',
        senderType: 'customer',
        senderId: 'contact-1',
        contentType: 'text',
        contentText: 'Hello',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      } as any
    ]);

    const req = new Request('http://localhost:3000/api/v1/conversations/conv-1/messages?limit=100');
    const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) });
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('msg-1');
  });

  it('returns 404 if conversation not found', async () => {
    vi.mocked(requireApiAuth).mockResolvedValue({ accountId: 'acc-1' } as any);
    
    vi.mocked(Conversation.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    } as any);

    const req = new Request('http://localhost:3000/api/v1/conversations/conv-1/messages?limit=100');
    const res = await GET(req, { params: Promise.resolve({ id: 'conv-1' }) });
    
    expect(res.status).toBe(404);
  });
});
