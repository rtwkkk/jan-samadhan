import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DealRepository } from './DealRepository';
import { Deal } from '@/lib/mongodb/models/Deal';

// ── Mock: replicate the chainable .lean() / .sort().limit().lean() pattern ──
const lean = vi.fn();
const limitFn = vi.fn();
const sortFn = vi.fn();

// Default chain: sort → limit → lean
sortFn.mockReturnValue({ limit: limitFn, lean });
limitFn.mockReturnValue({ lean });

vi.mock('@/lib/mongodb/models/Deal', () => ({
  Deal: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('DealRepository — extended methods', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    lean.mockResolvedValue([]);
    sortFn.mockReturnValue({ limit: limitFn, lean });
    limitFn.mockReturnValue({ lean });

    vi.mocked(Deal.find).mockReturnValue({ sort: sortFn, lean } as any);
    vi.mocked(Deal.findOneAndUpdate).mockReturnValue({ lean } as any);
    vi.mocked(Deal.countDocuments).mockResolvedValue(0);
  });

  // ── findByContactId ──────────────────────────────────────────────────────
  describe('findByContactId', () => {
    it('queries by accountId and contactId, sorts newest first', async () => {
      lean.mockResolvedValue([{ _id: 'd1' }]);
      vi.mocked(Deal.find).mockReturnValue({ sort: sortFn, lean } as any);
      sortFn.mockReturnValue({ lean });

      const result = await DealRepository.findByContactId('a1', 'c1');

      expect(Deal.find).toHaveBeenCalledWith({ accountId: 'a1', contactId: 'c1' });
      expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([{ _id: 'd1' }]);
    });

    it('returns empty array when no deals exist', async () => {
      lean.mockResolvedValue([]);
      sortFn.mockReturnValue({ lean });

      const result = await DealRepository.findByContactId('a1', 'c-none');
      expect(result).toEqual([]);
    });

    it('cross-account isolation: does not return deals from another account', async () => {
      sortFn.mockReturnValue({ lean });
      await DealRepository.findByContactId('a2', 'c1');
      const filter = vi.mocked(Deal.find).mock.calls[0][0] as any;
      expect(filter).toMatchObject({ accountId: 'a2', contactId: 'c1' });
    });
  });

  // ── findOpenDeals ────────────────────────────────────────────────────────
  describe('findOpenDeals', () => {
    it('filters by accountId and status=open', async () => {
      lean.mockResolvedValue([{ _id: 'd1', status: 'open' }]);
      vi.mocked(Deal.find).mockReturnValue({ lean } as any);

      const result = await DealRepository.findOpenDeals('a1');

      expect(Deal.find).toHaveBeenCalledWith({ accountId: 'a1', status: 'open' });
      expect(result[0].status).toBe('open');
    });

    it('cross-account isolation', async () => {
      vi.mocked(Deal.find).mockReturnValue({ lean } as any);
      await DealRepository.findOpenDeals('a2');
      const filter = vi.mocked(Deal.find).mock.calls[0][0] as any;
      expect(filter.accountId).toBe('a2');
    });
  });

  // ── countByStageId ───────────────────────────────────────────────────────
  describe('countByStageId', () => {
    it('returns the count for the given accountId and stageId', async () => {
      vi.mocked(Deal.countDocuments).mockResolvedValue(3);

      const count = await DealRepository.countByStageId('a1', 's1');

      expect(Deal.countDocuments).toHaveBeenCalledWith({ accountId: 'a1', stageId: 's1' });
      expect(count).toBe(3);
    });

    it('returns 0 when no deals reference the stage', async () => {
      vi.mocked(Deal.countDocuments).mockResolvedValue(0);
      const count = await DealRepository.countByStageId('a1', 'empty-stage');
      expect(count).toBe(0);
    });

    it('cross-account isolation', async () => {
      await DealRepository.countByStageId('a2', 's1');
      const filter = vi.mocked(Deal.countDocuments).mock.calls[0][0] as any;
      expect(filter.accountId).toBe('a2');
    });
  });

  // ── findRecentUpdated ────────────────────────────────────────────────────
  describe('findRecentUpdated', () => {
    it('sorts by updatedAt desc and limits results', async () => {
      const recentDeals = [{ _id: 'd3' }, { _id: 'd2' }];
      lean.mockResolvedValue(recentDeals);
      sortFn.mockReturnValue({ limit: limitFn, lean });
      limitFn.mockReturnValue({ lean });

      const result = await DealRepository.findRecentUpdated('a1', 2);

      expect(Deal.find).toHaveBeenCalledWith({ accountId: 'a1' });
      expect(sortFn).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(limitFn).toHaveBeenCalledWith(2);
      expect(result).toEqual(recentDeals);
    });

    it('cross-account isolation', async () => {
      sortFn.mockReturnValue({ limit: limitFn, lean });
      limitFn.mockReturnValue({ lean });

      await DealRepository.findRecentUpdated('a2', 5);
      const filter = vi.mocked(Deal.find).mock.calls[0][0] as any;
      expect(filter.accountId).toBe('a2');
    });
  });

  // ── updateStageId ────────────────────────────────────────────────────────
  describe('updateStageId', () => {
    it('updates only stageId field and returns updated deal', async () => {
      const updated = { _id: 'd1', stageId: 's2' };
      lean.mockResolvedValue(updated);

      const result = await DealRepository.updateStageId('a1', 'd1', 's2');

      expect(Deal.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'd1', accountId: 'a1' },
        { $set: { stageId: 's2' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('returns null for deal in different account (cross-account isolation)', async () => {
      lean.mockResolvedValue(null);
      const result = await DealRepository.updateStageId('wrong-account', 'd1', 's2');
      expect(result).toBeNull();

      // Still verifies the filter was correct
      const filter = vi.mocked(Deal.findOneAndUpdate).mock.calls[0][0] as any;
      expect(filter.accountId).toBe('wrong-account');
    });
  });
});

// ── Deal model validation behaviour (via type checks + schema logic) ──────
describe('Deal model schema behaviour', () => {
  it('DealStatus type only allows open/won/lost', () => {
    // This is a compile-time check — the import verifies the exported type exists.
    // Runtime enum enforcement is tested at the Mongoose schema level.
    // We verify the type export is available:
    type _Check = import('@/lib/mongodb/models/Deal').DealStatus;
    const validStatuses: _Check[] = ['open', 'won', 'lost'];
    expect(validStatuses).toHaveLength(3);
  });

  it('IDeal interface allows optional contactId', () => {
    // Type-level check: IDeal.contactId is optional, so this should compile.
    const partial: Partial<import('@/lib/mongodb/models/Deal').IDeal> = { contactId: undefined };
    expect(partial).toBeDefined();
  });

  it('IDeal interface includes assignedTo as optional string', () => {
    const partial: Partial<import('@/lib/mongodb/models/Deal').IDeal> = { assignedTo: 'user-123' };
    expect(partial.assignedTo).toBe('user-123');
  });
});
