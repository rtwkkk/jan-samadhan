import { Conversation, IConversation } from '../models/Conversation';
import { stripProtectedFields } from './BaseRepository';
import type { ClientSession } from 'mongoose';

export class ConversationRepository {
  static async findById(accountId: string, id: string, session?: ClientSession): Promise<IConversation | null> {
    return Conversation.findOne({ _id: id, accountId }).session(session || null).lean();
  }

  static async findByContactId(accountId: string, contactId: string, session?: ClientSession): Promise<IConversation | null> {
    return Conversation.findOne({ accountId, contactId }).session(session || null).lean();
  }

  static async findMany(accountId: string, filters: Record<string, any> = {}, limit: number = 50, session?: ClientSession): Promise<IConversation[]> {
    return Conversation.find({ ...filters, accountId }).session(session || null).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  static async create(data: Partial<IConversation>, session?: ClientSession): Promise<IConversation> {
    const conv = new Conversation(data);
    return conv.save({ session });
  }

  static async updateById(accountId: string, id: string, update: Partial<IConversation>, session?: ClientSession): Promise<IConversation | null> {
    const safeUpdate = stripProtectedFields(update);
    return Conversation.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true, session }).lean();
  }

  static async updateMetadata(accountId: string, id: string, lastMessageText: string, lastMessageAt: Date, incrementUnread: boolean, session?: ClientSession): Promise<IConversation | null> {
    const update: any = {
      $set: { lastMessageText, lastMessageAt }
    };
    if (incrementUnread) {
      update.$inc = { unreadCount: 1 };
    }
    return Conversation.findOneAndUpdate({ _id: id, accountId }, update, { new: true, session }).lean();
  }
  
  static async resetUnread(accountId: string, id: string, session?: ClientSession): Promise<IConversation | null> {
    return Conversation.findOneAndUpdate({ _id: id, accountId }, { $set: { unreadCount: 0 } }, { new: true, session }).lean();
  }

  // Atomic update for webhook: bump unread, update last message, and conditionally reopen.
  static async processInbound(accountId: string, id: string, lastMessageText: string, session?: ClientSession): Promise<IConversation | null> {
    // We use aggregation pipeline for conditional $set based on current document state
    const pipeline = [
      {
        $set: {
          unreadCount: { $add: [{ $ifNull: ["$unreadCount", 0] }, 1] },
          lastMessageText: lastMessageText,
          lastMessageAt: new Date(),
          status: {
            $cond: {
              if: { $eq: ["$status", "closed"] },
              then: "open",
              else: "$status"
            }
          }
        }
      }
    ];
    // findOneAndUpdate supports aggregation pipelines starting in MongoDB 4.2+
    // But Mongoose typing for findOneAndUpdate with pipeline might be tricky.
    // An alternative is a traditional update where we do it in two steps if needed, but since it's inside a transaction, a read-modify-write is perfectly safe!
    const conv = await Conversation.findOne({ _id: id, accountId }).session(session || null).lean();
    if (!conv) return null;

    const update: any = {
      $inc: { unreadCount: 1 },
      $set: {
        lastMessageText,
        lastMessageAt: new Date(),
      }
    };
    if (conv.status === 'closed') {
      update.$set.status = 'open';
    }

    return Conversation.findOneAndUpdate({ _id: id, accountId }, update, { new: true, session }).lean();
  }
}
