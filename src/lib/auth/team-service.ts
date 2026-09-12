import mongoose from 'mongoose';
import { User } from '@/lib/mongodb/models/User';
import { Account } from '@/lib/mongodb/models/Account';
import { randomUUID } from 'node:crypto';

export class TeamService {
  /**
   * Admin+ changes another member's role within the caller's account.
   * Mirrors `set_member_role`.
   */
  static async setMemberRole(callerUserId: string, targetUserId: string, newRole: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const caller = await User.findOne({ _id: callerUserId }).session(session).lean();
        if (!caller || !caller.accountId) throw new Error('42501:Caller has no account');
        if (caller.accountRole !== 'owner' && caller.accountRole !== 'admin') {
          throw new Error('42501:This action requires the admin role or higher');
        }

        if (callerUserId === targetUserId) {
          throw new Error('22023:Cannot change your own role');
        }

        const target = await User.findOne({ _id: targetUserId }).session(session);
        if (!target || !target.accountId) throw new Error('22023:Target user not found');
        if (target.accountId !== caller.accountId) throw new Error('42501:Target user is not a member of your account');

        if (target.accountRole === 'owner') throw new Error('22023:Use transfer_account_ownership to demote an owner');
        if (newRole === 'owner') throw new Error('22023:Use transfer_account_ownership to promote to owner');

        target.accountRole = newRole;
        await target.save({ session });
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Admin+ removes another member from the caller's account.
   * Mirrors `remove_account_member`. Returns the new personal account id.
   */
  static async removeMember(callerUserId: string, targetUserId: string): Promise<string> {
    let newAccountId = '';
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const caller = await User.findOne({ _id: callerUserId }).session(session).lean();
        if (!caller || !caller.accountId) throw new Error('42501:Caller has no account');
        if (caller.accountRole !== 'owner' && caller.accountRole !== 'admin') {
          throw new Error('42501:This action requires the admin role or higher');
        }

        if (callerUserId === targetUserId) {
          throw new Error('22023:Cannot remove yourself; transfer ownership or leave the account instead');
        }

        const target = await User.findOne({ _id: targetUserId }).session(session);
        if (!target || !target.accountId) throw new Error('22023:Target user not found');
        if (target.accountId !== caller.accountId) throw new Error('42501:Target user is not a member of your account');

        if (target.accountRole === 'owner') throw new Error('22023:Cannot remove the account owner; transfer ownership first');

        newAccountId = randomUUID();
        const accountName = target.fullName || target.email || 'My account';

        const newAccount = new Account({
          _id: newAccountId,
          name: accountName,
          ownerUserId: targetUserId,
        });
        await newAccount.save({ session });

        target.accountId = newAccountId;
        target.accountRole = 'owner';
        await target.save({ session });
      });
      return newAccountId;
    } finally {
      await session.endSession();
    }
  }
}
