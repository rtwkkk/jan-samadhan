import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from './route';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { Contact } from '@/lib/mongodb/models/Contact';
import { User } from '@/lib/mongodb/models/User';
import { requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';

vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: any) => new Response(err.message || 'Error', { status: err.status || 400 })),
}));
vi.mock('@/lib/mongodb/client');
vi.mock('@/lib/mongodb/repositories/DealRepository');
vi.mock('@/lib/mongodb/repositories/PipelineRepository');
vi.mock('@/lib/mongodb/models/Contact', () => ({
  Contact: {
    findOne: vi.fn(),
    find: vi.fn(() => ({ lean: vi.fn().mockResolvedValue([]) }))
  }
}));
vi.mock('@/lib/mongodb/models/User', () => ({
  User: {
    findOne: vi.fn(),
    find: vi.fn(() => ({ lean: vi.fn().mockResolvedValue([]) }))
  }
}));

describe('/api/deals/[id]', () => {
  const params = Promise.resolve({ id: "d1" });
  const mockDeal = {
    _id: 'd1', accountId: 'a1', pipelineId: 'p1', stageId: 's1', 
    title: 'Old Title', status: 'open'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
    vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'agent' } as any);
    vi.mocked(DealRepository.findById).mockResolvedValue(mockDeal as any);
  });

  describe('PATCH', () => {
    beforeEach(() => {
      vi.mocked(DealRepository.updateById).mockResolvedValue({ ...mockDeal, title: 'New' } as any);
    });

    it('updates basic fields', async () => {
      const req = new Request('http://localhost', {
        method: 'PATCH', body: JSON.stringify({ title: 'New Title', value: 100 })
      });
      const res = await PATCH(req, { params });
      expect(res.status).toBe(200);
      expect(DealRepository.updateById).toHaveBeenCalledWith('a1', 'd1', expect.objectContaining({
        title: 'New Title', value: 100
      }));
    });

    it('updates status', async () => {
      const req = new Request('http://localhost', {
        method: 'PATCH', body: JSON.stringify({ status: 'won' })
      });
      const res = await PATCH(req, { params });
      expect(res.status).toBe(200);
      expect(DealRepository.updateById).toHaveBeenCalledWith('a1', 'd1', expect.objectContaining({ status: 'won' }));
    });

    it('rejects invalid status', async () => {
      const req = new Request('http://localhost', {
        method: 'PATCH', body: JSON.stringify({ status: 'invalid' })
      });
      const res = await PATCH(req, { params });
      expect(res.status).toBe(400);
      expect(DealRepository.updateById).not.toHaveBeenCalled();
    });

    it('validates stage movement within same pipeline', async () => {
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's1' }, { id: 's2' }]
      } as any);
      const req = new Request('http://localhost', {
        method: 'PATCH', body: JSON.stringify({ stage_id: 's2' })
      });
      await PATCH(req, { params });
      
      expect(PipelineRepository.findById).toHaveBeenCalledWith('a1', 'p1');
      expect(DealRepository.updateById).toHaveBeenCalledWith('a1', 'd1', expect.objectContaining({
        pipelineId: 'p1', stageId: 's2'
      }));
    });

    it('rejects cross-account deal update', async () => {
      vi.mocked(DealRepository.findById).mockResolvedValue(null);
      const req = new Request('http://localhost', { method: 'PATCH', body: '{}' });
      const res = await PATCH(req, { params });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes deal via repository', async () => {
      vi.mocked(DealRepository.deleteById).mockResolvedValue(true);
      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);
      expect(DealRepository.deleteById).toHaveBeenCalledWith('a1', 'd1');
    });

    it('rejects if cross-account deal', async () => {
      vi.mocked(DealRepository.findById).mockResolvedValue(null);
      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
    });
  });
});
