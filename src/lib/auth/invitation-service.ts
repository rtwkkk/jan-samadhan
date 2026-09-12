import mongoose from 'mongoose';
import { Invitation } from '@/lib/mongodb/models/Invitation';
import { Account } from '@/lib/mongodb/models/Account';
import { User } from '@/lib/mongodb/models/User';
import { Contact } from '@/lib/mongodb/models/Contact';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import { Pipeline } from '@/lib/mongodb/models/Pipeline';

export interface PeekResult {
  ok: boolean;
  reason?: 'not_found' | 'expired' | 'used' | 'server_error';
  account_name?: string;
  role?: string;
  expires_at?: string;
}

export class InvitationService {
  static async peek(tokenHash: string): Promise<PeekResult> {
    try {
      const inv = await Invitation.findOne({ tokenHash }).lean();
      if (!inv) return { ok: false, reason: 'not_found' };
      if (inv.acceptedAt) return { ok: false, reason: 'used' };
      if (inv.expiresAt <= new Date()) return { ok: false, reason: 'expired' };

      const account = await Account.findOne({ _id: inv.accountId }).lean();
      if (!account) return { ok: false, reason: 'not_found' };

      return {
        ok: true,
        account_name: account.name,
        role: inv.role,
        expires_at: inv.expiresAt.toISOString(),
      };
    } catch (err) {
      console.error('[peek] error:', err);
      return { ok: false, reason: 'server_error' };
    }
  }

  static async redeem(userId: string, tokenHash: string): Promise<string> {
    const session = await mongoose.startSession();
    try {
      let resultAccountId = '';
      await session.withTransaction(async () => {
        const inv = await Invitation.findOne({ tokenHash }).session(session);
        if (!inv) throw new Error('22023:Invitation not found');
        if (inv.acceptedAt) throw new Error('22023:Invitation has already been redeemed');
        if (inv.expiresAt <= new Date()) throw new Error('22023:Invitation has expired');

        const user = await User.findOne({ _id: userId }).session(session);
        if (!user || !user.accountId) throw new Error('42501:Caller has no profile');

        const oldAccountId = user.accountId;
        const oldAccount = await Account.findOne({ _id: oldAccountId }).session(session);
        if (!oldAccount) throw new Error('42501:Caller account not found');

        if (oldAccountId === inv.accountId) {
          throw new Error('23505:You are already a member of this account');
        }

        if (oldAccount.ownerUserId !== userId) {
          throw new Error('23505:You are already in a shared account; sign up with a different email to join this one');
        }

        // Check if account has domain data. We only need to check the domains we currently migrate.
        const [hasContacts, hasConvos, hasPipelines] = await Promise.all([
          Contact.exists({ accountId: oldAccountId }).session(session),
          Conversation.exists({ accountId: oldAccountId }).session(session),
          Pipeline.exists({ accountId: oldAccountId }).session(session)
        ]);

        if (hasContacts || hasConvos || hasPipelines) {
          throw new Error('23505:Cannot join account — your current account has existing contacts, conversations, or other data that would be lost. Sign up with a different email or delete your data first.');
        }

        // Success: move user, delete old account, mark accepted
        user.accountId = inv.accountId;
        user.accountRole = inv.role;
        await user.save({ session });

        await Account.deleteOne({ _id: oldAccountId }).session(session);

        inv.acceptedAt = new Date();
        inv.acceptedByUserId = userId;
        await inv.save({ session });

        resultAccountId = inv.accountId;
      });
      return resultAccountId;
    } finally {
      await session.endSession();
    }
  }
}
