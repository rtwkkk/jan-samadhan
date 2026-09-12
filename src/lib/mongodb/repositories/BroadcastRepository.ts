import { Broadcast, IBroadcast } from '../models/Broadcast';

export class BroadcastRepository {
  static async findRecentByAccountId(accountId: string, limit = 5): Promise<IBroadcast[]> {
    return Broadcast.find({ accountId })
      .select('_id name status totalRecipients createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
