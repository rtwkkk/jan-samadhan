import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, GET } from './route';
import { requireApiAuth } from '@/lib/auth/api-context';
import { getContactById, setContactTags } from '@/lib/api/v1/contacts';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { unauthorized } from '@/lib/api/v1/respond';

// Mock dependencies
vi.mock('@/lib/auth/api-context', () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock('@/lib/api/v1/contacts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api/v1/contacts')>();
  return {
    ...mod,
    getContactById: vi.fn(),
    setContactTags: vi.fn(),
    resolveAuditUserId: vi.fn().mockResolvedValue('user-1'),
  };
});

vi.mock('@/lib/mongodb/repositories/ContactRepository', () => ({
  ContactRepository: {
    updateById: vi.fn(),
  },
}));

describe('/api/v1/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH', () => {
    it('updates contact with valid authenticated Mongo session', async () => {
      // Mock requireApiAuth to simulate a successful session
      vi.mocked(requireApiAuth).mockResolvedValue({
        authType: 'cookie',
        accountId: 'acct-1',
        keyId: 'cookie',
        scopes: [],
        createdBy: 'user-1',
      });

      // Existing contact
      vi.mocked(getContactById).mockResolvedValue({
        id: 'contact-1',
        phone: '+1234567890',
        name: 'Old Name'
      } as any);

      vi.mocked(ContactRepository.updateById).mockResolvedValue(true as any);

      const request = new Request('http://localhost/api/v1/contacts/contact-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name', tags: ['vip'] }),
      });

      const params = Promise.resolve({ id: 'contact-1' });
      const response = await PATCH(request, { params });
      expect(response.status).toBe(200);
      
      expect(requireApiAuth).toHaveBeenCalledWith(request, 'contacts:write', 'agent');
      expect(ContactRepository.updateById).toHaveBeenCalledWith('acct-1', 'contact-1', { name: 'New Name' });
      expect(setContactTags).toHaveBeenCalledWith('acct-1', 'user-1', 'contact-1', ['vip']);
    });

    it('returns 401 for unauthenticated requests', async () => {
      // Mock requireApiAuth to throw unauthorized
      vi.mocked(requireApiAuth).mockRejectedValue(unauthorized());

      const request = new Request('http://localhost/api/v1/contacts/contact-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const params = Promise.resolve({ id: 'contact-1' });
      const response = await PATCH(request, { params });
      expect(response.status).toBe(401);
    });

    it('blocks cross-account access', async () => {
      vi.mocked(requireApiAuth).mockResolvedValue({
        authType: 'cookie',
        accountId: 'acct-1',
        keyId: 'cookie',
        scopes: [],
        createdBy: 'user-1',
      });

      // Mock getContactById to return null (contact belongs to another account)
      vi.mocked(getContactById).mockResolvedValue(null);

      const request = new Request('http://localhost/api/v1/contacts/contact-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Hacker' }),
      });

      const params = Promise.resolve({ id: 'contact-1' });
      const response = await PATCH(request, { params });
      expect(response.status).toBe(404);
      expect(ContactRepository.updateById).not.toHaveBeenCalled();
    });

    it('works with valid API key authentication', async () => {
      vi.mocked(requireApiAuth).mockResolvedValue({
        authType: 'api_key',
        accountId: 'acct-1',
        keyId: 'key-1',
        scopes: ['contacts:write'],
        createdBy: null,
      });

      vi.mocked(getContactById).mockResolvedValue({
        id: 'contact-1',
        phone: '+1234567890',
        name: 'Old Name'
      } as any);

      vi.mocked(ContactRepository.updateById).mockResolvedValue(true as any);

      const request = new Request('http://localhost/api/v1/contacts/contact-1', {
        method: 'PATCH',
        body: JSON.stringify({ company: 'Acme Corp' }),
      });

      const params = Promise.resolve({ id: 'contact-1' });
      const response = await PATCH(request, { params });
      expect(response.status).toBe(200);
      
      expect(requireApiAuth).toHaveBeenCalledWith(request, 'contacts:write', 'agent');
      expect(ContactRepository.updateById).toHaveBeenCalledWith('acct-1', 'contact-1', { company: 'Acme Corp' });
    });
  });
});
