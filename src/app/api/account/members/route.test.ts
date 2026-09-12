import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getCurrentAccount } from '@/lib/auth/account';
import { User } from '@/lib/mongodb/models/User';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
  toErrorResponse: vi.fn(),
}));

vi.mock('@/lib/mongodb/models/User', () => ({
  User: {
    find: vi.fn(),
  }
}));

describe('GET /api/account/members', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns members formatted for viewer/agent (no emails)', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'agent' } as any);
    
    vi.mocked(User.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: 'u1', fullName: 'Agent', email: 'a@t.com', accountRole: 'agent', createdAt: '2026-01-01T00:00:00Z' },
          { _id: 'u2', fullName: 'Owner', email: 'o@t.com', accountRole: 'owner', createdAt: '2026-01-02T00:00:00Z' }
        ])
      })
    } as any);

    const res = await GET();
    const json = await res.json();
    
    expect(json.members).toHaveLength(2);
    expect(json.members[0].email).toBeNull();
    expect(json.members[0].full_name).toBe('Agent');
    expect(json.members[1].email).toBeNull();
  });

  it('returns members with emails for admin+', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
    
    vi.mocked(User.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: 'u1', fullName: 'Agent', email: 'a@t.com', accountRole: 'agent', createdAt: '2026-01-01T00:00:00Z' }
        ])
      })
    } as any);

    const res = await GET();
    const json = await res.json();
    
    expect(json.members).toHaveLength(1);
    expect(json.members[0].email).toBe('a@t.com');
  });
});
