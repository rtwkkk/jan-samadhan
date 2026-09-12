import { unauthorized } from '@/lib/api/v1/respond';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { requireApiAuth } from '@/lib/auth/api-context';
import { findOrCreateContact, getContactById } from '@/lib/api/v1/contacts';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';

// Mock dependencies
vi.mock('@/lib/auth/api-context', () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock('@/lib/api/v1/contacts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api/v1/contacts')>();
  return {
    ...mod,
    findOrCreateContact: vi.fn(),
    getContactById: vi.fn(),
    serializeContactFromMongo: vi.fn((doc) => doc),
    resolveAuditUserId: vi.fn().mockResolvedValue('user-1'),
  };
});

vi.mock('@/lib/mongodb/repositories/ContactRepository', () => ({
  ContactRepository: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/mongodb/client', () => ({
  connectToDatabase: vi.fn(),
}));

describe('/api/v1/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('creates contact with valid authenticated Mongo session', async () => {
      // Mock requireApiAuth to simulate a successful session
      vi.mocked(requireApiAuth).mockResolvedValue({
        authType: 'cookie',
        accountId: 'acct-1',
        keyId: 'cookie',
        scopes: [],
        createdBy: 'user-1',
      });

      vi.mocked(findOrCreateContact).mockResolvedValue({
        id: 'contact-1',
        created: true,
      });

      vi.mocked(getContactById).mockResolvedValue({
        id: 'contact-1',
        phone: '+1234567890',
      } as any);

      const request = new Request('http://localhost/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ phone: '+1234567890' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      
      const json = await response.json();
      expect(json.data.id).toBe('contact-1');
      expect(json.data.phone).toBe('+1234567890');
      
      expect(requireApiAuth).toHaveBeenCalledWith(request, 'contacts:write', 'agent');
    });

    it('returns 401 for unauthenticated requests', async () => {
      // Mock requireApiAuth to throw 401
      vi.mocked(requireApiAuth).mockRejectedValue(unauthorized());

      const request = new Request('http://localhost/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ phone: '+1234567890' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('blocks cross-account access (mocked at the route level)', async () => {
      // The actual cross-account check happens in getContactById/findOrCreateContact which requires accountId
      vi.mocked(requireApiAuth).mockResolvedValue({
        authType: 'cookie',
        accountId: 'acct-1', // Evaluated as account-1
        keyId: 'cookie',
        scopes: [],
        createdBy: 'user-1',
      });

      vi.mocked(findOrCreateContact).mockResolvedValue({
        id: 'contact-1',
        created: true,
      });

      const request = new Request('http://localhost/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ phone: '+1234567890' }),
      });

      await POST(request);

      // Verify that findOrCreateContact was called with the context's accountId
      expect(findOrCreateContact).toHaveBeenCalledWith(
        'acct-1', // Enforces tenant isolation
        'user-1',
        expect.any(Object)
      );
    });
  });
});
