import mongoose from 'mongoose';
import { User } from '@/lib/mongodb/models/User';
import { Account } from '@/lib/mongodb/models/Account';

export class OwnershipService {
  /**
   * Owner only. Atomically:
   *   - demotes the current owner to 'admin'
   *   - promotes the target member to 'owner'
   *   - updates accounts.ownerUserId
   */
  static async transferOwnership(callerUserId: string, targetUserId: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const caller = await User.findOne({ _id: callerUserId }).session(session);
        if (!caller || !caller.accountId) {
          throw new Error('42501:Caller has no account');
        }
        
        if (caller.accountRole !== 'owner') {
          throw new Error('42501:Only the account owner can transfer ownership');
        }

        if (callerUserId === targetUserId) {
          throw new Error('22023:You are already the owner');
        }

        const target = await User.findOne({ _id: targetUserId }).session(session);
        if (!target || !target.accountId) {
          throw new Error('22023:Target user not found');
        }

        if (target.accountId !== caller.accountId) {
          throw new Error('42501:Target user is not a member of your account');
        }

        const account = await Account.findOne({ _id: caller.accountId }).session(session);
        if (!account) {
          throw new Error('22023:Account not found');
        }

        caller.accountRole = 'admin';
        await caller.save({ session });

        target.accountRole = 'owner';
        await target.save({ session });

        account.ownerUserId = targetUserId;
        await account.save({ session });
      });
    } finally {
      await session.endSession();
    }
  }
}
