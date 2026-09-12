import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { Contact } from '@/lib/mongodb/models/Contact';
import { User } from '@/lib/mongodb/models/User';
import { getCurrentAccount, requireRole } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';

vi.mock('@/lib/auth/account', () => ({
  getCurrentAccount: vi.fn(),
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

describe('/api/deals', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({} as any);
  });

  describe('GET', () => {
    const mockDeal = {
      _id: 'd1', accountId: 'a1', pipelineId: 'p1', stageId: 's1', 
      title: 'Deal 1', value: 100, currency: 'USD', status: 'open',
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01')
    };

    it('returns deals by pipelineId with correct shape', async () => {
      vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'member' } as any);
      vi.mocked(DealRepository.findByPipelineId).mockResolvedValue([mockDeal] as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's1', name: 'Lead' }]
      } as any);

      const req = new Request('http://localhost?pipelineId=p1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].id).toBe('d1');
      expect(json[0].pipeline_id).toBe('p1');
      expect(json[0].stage.name).toBe('Lead');
      expect(DealRepository.findByPipelineId).toHaveBeenCalledWith('a1', 'p1');
    });

    it('returns deals by contactId', async () => {
      vi.mocked(getCurrentAccount).mockResolvedValue({ accountId: 'a1', role: 'member' } as any);
      vi.mocked(DealRepository.findByContactId).mockResolvedValue([mockDeal] as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue(null);

      const req = new Request('http://localhost?contactId=c1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(DealRepository.findByContactId).toHaveBeenCalledWith('a1', 'c1');
    });
  });

  describe('POST', () => {
    const validBody = {
      title: 'New Deal',
      pipeline_id: 'p1',
      stage_id: 's1',
      value: 500,
    };

    beforeEach(() => {
      vi.mocked(requireRole).mockResolvedValue({ accountId: 'a1', role: 'agent' } as any);
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 's1' }]
      } as any);
      vi.mocked(DealRepository.create).mockResolvedValue({
        _id: 'd1', accountId: 'a1', pipelineId: 'p1', stageId: 's1', title: 'New Deal'
      } as any);
    });

    it('creates deal successfully', async () => {
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify(validBody)
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.title).toBe('New Deal');

      expect(DealRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'a1', pipelineId: 'p1', stageId: 's1', status: 'open' })
      );
    });

    it('rejects cross-account pipeline access', async () => {
      vi.mocked(PipelineRepository.findById).mockResolvedValue(null);
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify(validBody)
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it('rejects invalid stage', async () => {
      vi.mocked(PipelineRepository.findById).mockResolvedValue({
        _id: 'p1', accountId: 'a1', stages: [{ id: 'other-stage' }]
      } as any);
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify(validBody)
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it('validates and accepts contactId if contact exists', async () => {
      vi.mocked(Contact.findOne).mockReturnValue({ lean: () => ({ _id: 'c1' }) } as any);
      
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify({ ...validBody, contact_id: 'c1' })
      });
      await POST(req);
      
      expect(Contact.findOne).toHaveBeenCalledWith({ _id: 'c1', accountId: 'a1' });
      expect(DealRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: 'c1' })
      );
    });

    it('rejects if contact cross-account (not found)', async () => {
      vi.mocked(Contact.findOne).mockReturnValue({ lean: () => null } as any);
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify({ ...validBody, contact_id: 'c2' })
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it('validates assigned_to if user exists', async () => {
      vi.mocked(User.findOne).mockReturnValue({ lean: () => ({ _id: 'u1' }) } as any);
      const req = new Request('http://localhost', {
        method: 'POST', body: JSON.stringify({ ...validBody, assigned_to: 'u1' })
      });
      await POST(req);
      expect(User.findOne).toHaveBeenCalledWith({ _id: 'u1', accountId: 'a1' });
    });
  });
});
