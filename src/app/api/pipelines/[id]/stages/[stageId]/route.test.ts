import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './route';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: any) => new Response(err.message || 'Error', { status: 400 })),
}));
vi.mock('@/lib/mongodb/client');
vi.mock('@/lib/mongodb/repositories/PipelineRepository');
vi.mock('@/lib/mongodb/repositories/DealRepository');

describe('/api/pipelines/[id]/stages/[stageId]', () => {
  const params = Promise.resolve({ id: "p1", stageId: "s1" });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
  });

  describe('DELETE', () => {
    it('deletes an empty stage', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's1' }]
      } as any);
      vi.mocked(DealRepository.countByStageId).mockResolvedValue(0);
      vi.mocked(PipelineRepository.removeStage).mockResolvedValue({} as any);

      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(200);
      expect(PipelineRepository.removeStage).toHaveBeenCalledWith('a1', 'p1', 's1');
    });

    it('rejects deletion if deals exist in stage', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's1' }]
      } as any);
      vi.mocked(DealRepository.countByStageId).mockResolvedValue(3);

      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe('STAGE_HAS_DEALS');
      
      expect(PipelineRepository.removeStage).not.toHaveBeenCalled();
    });

    it('returns 404 if stage not found in pipeline', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's2' }] // different stage ID
      } as any);

      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
      expect(DealRepository.countByStageId).not.toHaveBeenCalled();
    });

    it('returns 404 if cross-account pipeline access attempted', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue(null);

      const req = new Request('http://localhost', { method: 'DELETE' });
      const res = await DELETE(req, { params });
      expect(res.status).toBe(404);
      expect(PipelineRepository.removeStage).not.toHaveBeenCalled();
    });
  });
});
