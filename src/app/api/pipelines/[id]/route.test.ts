import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from './route';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import mongoose from 'mongoose';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: any) => new Response(err.message || 'Error', { status: 400 })),
}));
vi.mock('@/lib/mongodb/client');
vi.mock('@/lib/mongodb/repositories/PipelineRepository');
vi.mock('@/lib/mongodb/repositories/DealRepository');
vi.mock('mongoose');

describe('/api/pipelines/[id]', () => {
  const params = Promise.resolve({ id: "p1" });
  const mockSession = {
    withTransaction: vi.fn(async (cb) => cb()),
    endSession: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
    vi.mocked(mongoose.startSession).mockResolvedValue(mockSession as any);
  });

  describe('PATCH', () => {
    it('renames pipeline successfully', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.updateById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', name: 'Renamed Pipe', stages: []
      } as any);

      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed Pipe' }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(200);
      expect(PipelineRepository.updateById).toHaveBeenCalledWith('a1', 'p1', { name: 'Renamed Pipe' });
    });

    it('rejects cross-account access (not found)', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a2', role: 'admin' } as any);
      vi.mocked(PipelineRepository.updateById).mockResolvedValue(null);

      const req = new Request('http://localhost', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const res = await PATCH(req, { params });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes pipeline and cascade deletes deals', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({ _id: 'p1', accountId: 'a1' } as any);
      vi.mocked(PipelineRepository.deleteById).mockResolvedValue(true);
      
      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);

      expect(mockSession.withTransaction).toHaveBeenCalled();
      expect(DealRepository.deleteByPipelineId).toHaveBeenCalledWith('a1', 'p1');
      expect(PipelineRepository.deleteById).toHaveBeenCalledWith('a1', 'p1');
    });

    it('rejects if pipeline not found', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue(null);

      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
      expect(DealRepository.deleteByPipelineId).not.toHaveBeenCalled();
    });
  });
});
