import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PUT } from './route';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: any) => new Response(err.message || 'Error', { status: 400 })),
}));
vi.mock('@/lib/mongodb/client');
vi.mock('@/lib/mongodb/repositories/PipelineRepository');

describe('/api/pipelines/[id]/stages', () => {
  const params = Promise.resolve({ id: "p1" });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
  });

  describe('POST', () => {
    it('adds a new stage successfully', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.addStage).mockResolvedValue({
        _id: 'p1',
        accountId: 'a1',
        stages: [{ name: 'New Stage', color: '#000', position: 1 }]
      } as any);

      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Stage', color: '#000', position: 1 }),
      });

      const res = await POST(req, { params });
      expect(res.status).toBe(201);
      
      expect(PipelineRepository.addStage).toHaveBeenCalledWith(
        'a1', 'p1',
        expect.objectContaining({ name: 'New Stage', color: '#000', position: 1 })
      );
    });

    it('rejects cross-account (not found)', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a2', role: 'admin' } as any);
      vi.mocked(PipelineRepository.addStage).mockResolvedValue(null);

      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'Stage' }),
      });

      const res = await POST(req, { params });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('batch updates stages and preserves existing IDs', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.updateStagesBatch).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: []
      } as any);

      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({
          stages: [{ id: 's1', name: 'Renamed', color: '#111', position: 0 }]
        }),
      });

      const res = await PUT(req, { params });
      expect(res.status).toBe(200);

      expect(PipelineRepository.updateStagesBatch).toHaveBeenCalledWith(
        'a1', 'p1',
        expect.arrayContaining([
          expect.objectContaining({ id: 's1', name: 'Renamed' })
        ])
      );
    });

    it('rejects missing stage names', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({
          stages: [{ id: 's1', name: '', color: '#111', position: 0 }]
        }),
      });

      const res = await PUT(req, { params });
      expect(res.status).toBe(400);
      expect(PipelineRepository.updateStagesBatch).not.toHaveBeenCalled();
    });
  });
});
