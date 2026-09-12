import { Deal, IDeal } from '../models/Deal';
import { stripProtectedFields } from './BaseRepository';

export class DealRepository {
  static async findById(accountId: string, id: string): Promise<IDeal | null> {
    return Deal.findOne({ _id: id, accountId }).lean();
  }

  static async findByPipelineId(accountId: string, pipelineId: string): Promise<IDeal[]> {
    return Deal.find({ accountId, pipelineId }).sort({ createdAt: -1 }).lean();
  }

  static async create(data: Partial<IDeal>): Promise<IDeal> {
    const deal = new Deal(data);
    return deal.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IDeal>): Promise<IDeal | null> {
    const safeUpdate = stripProtectedFields(update);
    return Deal.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Deal.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }

  /**
   * Returns all deals for a given contact, newest first.
   * Enforces accountId tenant isolation.
   */
  static async findByContactId(accountId: string, contactId: string): Promise<IDeal[]> {
    return Deal.find({ accountId, contactId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Returns all open deals for the account.
   * Used by dashboard metrics to compute total pipeline value.
   */
  static async findOpenDeals(accountId: string): Promise<IDeal[]> {
    return Deal.find({ accountId, status: 'open' }).lean();
  }

  /**
   * Counts deals referencing a given stage id.
   * Used as a guard before deleting a pipeline stage.
   */
  static async countByStageId(accountId: string, stageId: string): Promise<number> {
    return Deal.countDocuments({ accountId, stageId });
  }

  /**
   * Returns the most-recently updated deals for the account activity feed.
   */
  static async findRecentUpdated(accountId: string, limit: number): Promise<IDeal[]> {
    return Deal.find({ accountId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Optimized single-field update for deal drag-and-drop stage moves.
   * Enforces accountId tenant isolation.
   */
  static async updateStageId(accountId: string, dealId: string, stageId: string): Promise<IDeal | null> {
    return Deal.findOneAndUpdate(
      { _id: dealId, accountId },
      { $set: { stageId } },
      { new: true },
    ).lean();
  }

  /**
   * Deletes all deals belonging to a given pipeline.
   * Called when a pipeline is deleted (cascade semantics).
   */
  static async deleteByPipelineId(accountId: string, pipelineId: string): Promise<number> {
    const result = await Deal.deleteMany({ accountId, pipelineId });
    return result.deletedCount;
  }
}
