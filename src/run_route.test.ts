import { describe, it, vi } from 'vitest';
import { GET } from './/app/api/v1/conversations/route';
import { requireApiAuth } from './/lib/auth/api-context';

vi.mock('.//lib/auth/api-context', () => ({
  requireApiAuth: vi.fn().mockResolvedValue({ accountId: 'acc-1' })
}));

vi.mock('.//lib/mongodb/client', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true)
}));

import { Conversation } from './/lib/mongodb/models/Conversation';
vi.mock('.//lib/mongodb/models/Conversation', () => ({
  Conversation: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              { 
                _id: 'conv-1', 
                accountId: 'acc-1',
                status: 'open',
                unreadCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                contactId: {
                  _id: 'contact-1',
                  name: 'Test',
                  phone: '1234567890',
                  createdAt: new Date()
                }
              }
            ])
          })
        })
      })
    })
  }
}));

describe('Debug Conversations Route', () => {
  it('runs GET', async () => {
    const req = new Request('http://localhost/api/v1/conversations?limit=100');
    const res = await GET(req);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  });
});
