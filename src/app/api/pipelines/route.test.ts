import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { getCurrentAccount, requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import mongoose from 'mongoose';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: any) => new Response(err.message || 'Error', { status: 400 })),
}));
vi.mock('@/lib/mongodb/client');
vi.mock('@/lib/mongodb/repositories/PipelineRepository');
vi.mock('mongoose');

describe('/api/pipelines', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
  });

  describe('GET', () => {
    it('returns pipelines for authenticated account', async () => {
      vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'member' } as any);
      vi.mocked(PipelineRepository.findMany).mockResolvedValue([
        { _id: 'p1', accountId: 'a1', name: 'Pipe', stages: [] } as any,
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].id).toBe('p1');
      expect(PipelineRepository.findMany).toHaveBeenCalledWith('a1');
    });

    it('sorts pipelines by createdAt ascending', async () => {
      vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'member' } as any);
      vi.mocked(PipelineRepository.findMany).mockResolvedValue([
        { _id: 'p2', accountId: 'a1', name: 'Pipe2', stages: [], createdAt: new Date('2024-02-01') } as any,
        { _id: 'p1', accountId: 'a1', name: 'Pipe1', stages: [], createdAt: new Date('2024-01-01') } as any,
      ]);

      const res = await GET();
      const json = await res.json();
      expect(json[0].id).toBe('p1');
      expect(json[1].id).toBe('p2');
    });
  });

  describe('POST', () => {
    const mockSession = {
      withTransaction: vi.fn(async (cb) => cb()),
      endSession: vi.fn(),
    };

    beforeEach(() => {
      vi.mocked(mongoose.startSession).mockResolvedValue(mockSession as any);
    });

    it('creates pipeline with default stages in a transaction', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      vi.mocked(PipelineRepository.create).mockResolvedValue({
        _id: 'p1',
        accountId: 'a1',
        name: 'New Pipe',
        stages: [],
      } as any);

      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Pipe' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe('New Pipe');
      
      expect(mockSession.withTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(PipelineRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'a1',
          name: 'New Pipe',
          stages: expect.arrayContaining([
            expect.objectContaining({ name: 'New Lead' })
          ])
        })
      );
    });

    it('rejects missing name', async () => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'admin' } as any);
      const req = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects non-admin users', async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error('Forbidden'));
      const req = new Request('http://localhost', { method: 'POST', body: '{}' });
      const res = await POST(req);
      expect(res.status).toBe(400); // Because we mapped generic errors to 400 or 500 depending on implementation of toErrorResponse. We just check if it's handled.
    });
  });
});
