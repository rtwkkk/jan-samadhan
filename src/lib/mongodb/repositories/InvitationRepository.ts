import { Invitation, IInvitation } from '../models/Invitation';
import { stripProtectedFields } from './BaseRepository';

export class InvitationRepository {
  static async findById(accountId: string, id: string): Promise<IInvitation | null> {
    return Invitation.findOne({ _id: id, accountId }).lean();
  }

  static async findByTokenHash(tokenHash: string): Promise<IInvitation | null> {
    return Invitation.findOne({ tokenHash }).lean();
  }

  static async listByAccountId(accountId: string): Promise<IInvitation[]> {
    return Invitation.find({ accountId }).sort({ createdAt: -1 }).lean();
  }

  static async create(data: Partial<IInvitation>): Promise<IInvitation> {
    const invite = new Invitation(data);
    return invite.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IInvitation>): Promise<IInvitation | null> {
    const safeUpdate = stripProtectedFields(update, ['_id', 'accountId', 'tokenHash', 'createdAt']);
    return Invitation.findOneAndUpdate(
      { _id: id, accountId },
      { $set: safeUpdate },
      { new: true }
    ).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const res = await Invitation.deleteOne({ _id: id, accountId });
    return res.deletedCount === 1;
  }
}
