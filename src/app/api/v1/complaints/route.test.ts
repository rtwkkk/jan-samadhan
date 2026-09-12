import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { requireApiAuth } from '@/lib/auth/api-context';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';
import { serializeComplaintFromMongo } from '@/lib/api/v1/complaints';
import { toApiErrorResponse } from '@/lib/api/v1/respond';

vi.mock('@/lib/auth/api-context', () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock('@/lib/mongodb/repositories/ComplaintRepository', () => ({
  ComplaintRepository: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/mongodb/client', () => ({
  connectToDatabase: vi.fn(),
}));

describe('/api/v1/complaints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(requireApiAuth).mockRejectedValueOnce(new Error('Unauthorized'));
      const req = new Request('http://localhost/api/v1/complaints', { method: 'POST', body: JSON.stringify({}) });
      const res = await POST(req);
      expect(res.status).toBe(500); // Standard toApiErrorResponse fallback
    });

    it('rejects invalid JSON', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      const req = new Request('http://localhost/api/v1/complaints', { method: 'POST', body: 'invalid-json' });
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error.code).toBe('bad_request');
    });

    it('rejects missing required fields', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      const req = new Request('http://localhost/api/v1/complaints', {
        method: 'POST',
        body: JSON.stringify({ citizenName: 'John' }) // missing other required fields
      });
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error.message).toContain('required');
    });

    it('creates a complaint successfully and ignores provided accountId', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      const mockCreated = {
        _id: 'cmp-uuid',
        accountId: 'acc-1',
        complaintId: 'CMP-123456',
        citizenName: 'Jane Doe',
        phone: '1234567890',
        complaintType: 'Water',
        description: 'No water',
        district: 'North',
        villageCityBlock: 'Block A',
        priority: 'high',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(ComplaintRepository.create).mockResolvedValueOnce(mockCreated as any);

      const req = new Request('http://localhost/api/v1/complaints', {
        method: 'POST',
        body: JSON.stringify({
          accountId: 'malicious-account', // should be ignored
          citizenName: 'Jane Doe',
          phone: '1234567890',
          complaintType: 'Water',
          description: 'No water',
          district: 'North',
          villageCityBlock: 'Block A',
          priority: 'high'
        })
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(ComplaintRepository.create).toHaveBeenCalledWith('acc-1', expect.objectContaining({
        citizenName: 'Jane Doe'
      }));
      expect(json.data.complaint_id).toBe('CMP-123456');
    });
  });

  describe('GET', () => {
    it('returns a paginated list of complaints', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      
      const mockDocs = [{
        _id: 'cmp-uuid-1',
        accountId: 'acc-1',
        complaintId: 'CMP-111111',
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      
      vi.mocked(ComplaintRepository.findMany).mockResolvedValueOnce(mockDocs as any);

      const req = new Request('http://localhost/api/v1/complaints?limit=10');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(ComplaintRepository.findMany).toHaveBeenCalledWith('acc-1', { accountId: 'acc-1' }, 11);
      expect(json.data).toHaveLength(1);
      expect(json.meta.next_cursor).toBeNull();
    });

    it('filters by search and status', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      vi.mocked(ComplaintRepository.findMany).mockResolvedValueOnce([]);

      const req = new Request('http://localhost/api/v1/complaints?search=John&status=open');
      const res = await GET(req);
      
      expect(res.status).toBe(200);
      expect(ComplaintRepository.findMany).toHaveBeenCalledWith('acc-1', expect.objectContaining({
        accountId: 'acc-1',
        status: 'open',
        $or: expect.any(Array)
      }), 51); // 50 default limit + 1
    });
  });
});
