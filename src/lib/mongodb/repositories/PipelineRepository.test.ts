import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineRepository } from './PipelineRepository';
import { Pipeline } from '@/lib/mongodb/models/Pipeline';

vi.mock('@/lib/mongodb/models/Pipeline', () => ({
  Pipeline: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

const lean = vi.fn();
const chainable = { lean };

describe('PipelineRepository — stage management', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    lean.mockResolvedValue(null);
    vi.mocked(Pipeline.findOneAndUpdate).mockReturnValue(chainable as any);
  });

  // ── addStage ────────────────────────────────────────────────────────────
  describe('addStage', () => {
    it('uses $push and returns updated pipeline', async () => {
      const updated = { _id: 'p1', accountId: 'a1', stages: [{ id: 's1', name: 'Lead', position: 0, color: '#fff' }] };
      lean.mockResolvedValue(updated);

      const result = await PipelineRepository.addStage('a1', 'p1', { name: 'Lead', position: 0, color: '#fff' });

      expect(Pipeline.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p1', accountId: 'a1' },
        expect.objectContaining({ $push: expect.any(Object) }),
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('generates a stage id when none is supplied', async () => {
      lean.mockResolvedValue({});
      await PipelineRepository.addStage('a1', 'p1', { name: 'Stage', position: 0, color: '#000' });

      const call = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0];
      const pushed = (call[1] as any).$push.stages;
      expect(typeof pushed.id).toBe('string');
      expect(pushed.id.length).toBeGreaterThan(0);
    });

    it('uses supplied stage id if provided', async () => {
      lean.mockResolvedValue({});
      await PipelineRepository.addStage('a1', 'p1', { id: 'explicit-id', name: 'Stage', position: 0, color: '#000' });

      const call = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0];
      expect((call[1] as any).$push.stages.id).toBe('explicit-id');
    });

    it('scopes query to accountId (cross-account isolation)', async () => {
      lean.mockResolvedValue(null);
      await PipelineRepository.addStage('a2', 'p1', { name: 'X', position: 0, color: '#000' });

      const filter = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0][0];
      expect(filter).toMatchObject({ _id: 'p1', accountId: 'a2' });
    });
  });

  // ── updateStage ─────────────────────────────────────────────────────────
  describe('updateStage', () => {
    it('uses arrayFilters to match stage by id and returns updated pipeline', async () => {
      const updated = { _id: 'p1', stages: [{ id: 's1', name: 'Updated', position: 0, color: '#fff' }] };
      lean.mockResolvedValue(updated);

      const result = await PipelineRepository.updateStage('a1', 'p1', 's1', { name: 'Updated' });

      expect(Pipeline.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p1', accountId: 'a1' },
        { $set: { 'stages.$[s].name': 'Updated' } },
        { new: true, arrayFilters: [{ 's.id': 's1' }] },
      );
      expect(result).toEqual(updated);
    });

    it('scopes query to accountId (cross-account isolation)', async () => {
      await PipelineRepository.updateStage('a2', 'p1', 's1', { color: '#abc' });
      const filter = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0][0];
      expect(filter).toMatchObject({ _id: 'p1', accountId: 'a2' });
    });

    it('does not include undefined fields in $set', async () => {
      lean.mockResolvedValue({});
      await PipelineRepository.updateStage('a1', 'p1', 's1', { color: '#blue' });

      const update = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0][1] as any;
      expect(update.$set).not.toHaveProperty('stages.$[s].name');
      expect(update.$set).not.toHaveProperty('stages.$[s].position');
      expect(update.$set['stages.$[s].color']).toBe('#blue');
    });
  });

  // ── removeStage ─────────────────────────────────────────────────────────
  describe('removeStage', () => {
    it('uses $pull with stage id and returns updated pipeline', async () => {
      const updated = { _id: 'p1', stages: [] };
      lean.mockResolvedValue(updated);

      const result = await PipelineRepository.removeStage('a1', 'p1', 's1');

      expect(Pipeline.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p1', accountId: 'a1' },
        { $pull: { stages: { id: 's1' } } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('returns null if pipeline not found or cross-account', async () => {
      lean.mockResolvedValue(null);
      const result = await PipelineRepository.removeStage('wrong-account', 'p1', 's1');
      expect(result).toBeNull();
    });
  });

  // ── updateStagesBatch ───────────────────────────────────────────────────
  describe('updateStagesBatch', () => {
    it('replaces entire stages array atomically', async () => {
      const newStages = [
        { id: 's2', name: 'Won', position: 1, color: '#0f0' },
        { id: 's1', name: 'Lead', position: 0, color: '#fff' },
      ];
      const updated = { _id: 'p1', stages: newStages };
      lean.mockResolvedValue(updated);

      const result = await PipelineRepository.updateStagesBatch('a1', 'p1', newStages);

      expect(Pipeline.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'p1', accountId: 'a1' },
        { $set: { stages: newStages } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('scopes query to accountId (cross-account isolation)', async () => {
      lean.mockResolvedValue(null);
      await PipelineRepository.updateStagesBatch('a2', 'p1', []);
      const filter = vi.mocked(Pipeline.findOneAndUpdate).mock.calls[0][0];
      expect(filter).toMatchObject({ _id: 'p1', accountId: 'a2' });
    });
  });
});
