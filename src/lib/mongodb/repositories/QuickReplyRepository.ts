import { QuickReply, IQuickReply } from '../models/QuickReply';


export class QuickReplyRepository {
  static async findByAccountId(accountId: string): Promise<IQuickReply[]> {
    return QuickReply.find({ accountId })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async create(accountId: string, userId: string, data: Partial<IQuickReply>): Promise<IQuickReply> {
    const doc = new QuickReply({
      _id: crypto.randomUUID(),
      accountId,
      userId,
      title: data.title,
      kind: data.kind,
      contentText: data.contentText ?? null,
      interactivePayload: data.interactivePayload ?? null,
    });
    return doc.save();
  }

  static async update(accountId: string, id: string, data: Partial<IQuickReply>): Promise<IQuickReply | null> {
    return QuickReply.findOneAndUpdate(
      { _id: id, accountId },
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  static async delete(accountId: string, id: string): Promise<boolean> {
    const result = await QuickReply.deleteOne({ _id: id, accountId });
    return result.deletedCount > 0;
  }
}
