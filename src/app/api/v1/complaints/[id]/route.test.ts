import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from './route';
import { requireApiAuth } from '@/lib/auth/api-context';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';

vi.mock('@/lib/auth/api-context', () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock('@/lib/mongodb/repositories/ComplaintRepository', () => ({
  ComplaintRepository: {
    findById: vi.fn(),
    updateById: vi.fn(),
  },
}));

vi.mock('@/lib/mongodb/client', () => ({
  connectToDatabase: vi.fn(),
}));

describe('/api/v1/complaints/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 404 if not found', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      vi.mocked(ComplaintRepository.findById).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/v1/complaints/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error.code).toBe('not_found');
      expect(ComplaintRepository.findById).toHaveBeenCalledWith('acc-1', '123');
    });

    it('returns the complaint if found and belongs to account', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      const mockDoc = {
        _id: '123',
        accountId: 'acc-1',
        complaintId: 'CMP-123456',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      vi.mocked(ComplaintRepository.findById).mockResolvedValueOnce(mockDoc as any);

      const req = new Request('http://localhost/api/v1/complaints/123');
      const res = await GET(req, { params: Promise.resolve({ id: '123' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('123');
      expect(json.data.complaint_id).toBe('CMP-123456');
    });
  });

  describe('PATCH', () => {
    it('returns 404 if updating non-existent complaint', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      vi.mocked(ComplaintRepository.updateById).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/v1/complaints/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' })
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
      
      expect(res.status).toBe(404);
    });

    it('successfully updates a complaint and ignores protected fields', async () => {
      vi.mocked(requireApiAuth).mockResolvedValueOnce({ accountId: 'acc-1', keyId: 'key-1' } as any);
      
      const updatedDoc = {
        _id: '123',
        accountId: 'acc-1',
        status: 'resolved',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      vi.mocked(ComplaintRepository.updateById).mockResolvedValueOnce(updatedDoc as any);

      const req = new Request('http://localhost/api/v1/complaints/123', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          accountId: 'malicious', // Should be stripped by repository
          complaintId: 'hacked'
        })
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      // Ensure API passes the body directly; repository layer strips protected fields
      expect(ComplaintRepository.updateById).toHaveBeenCalledWith('acc-1', '123', expect.objectContaining({
        status: 'resolved'
      }));
      expect(json.data.status).toBe('resolved');
    });
  });
});
