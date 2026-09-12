import { Message, IMessage } from '../models/Message';
import { stripProtectedFields } from './BaseRepository';
import type { ClientSession } from 'mongoose';

export class MessageRepository {
  static async findById(accountId: string, id: string, session?: ClientSession): Promise<IMessage | null> {
    return Message.findOne({ _id: id, accountId }).session(session || null).lean();
  }

  static async findByConversationId(accountId: string, conversationId: string, limit: number = 50, skip: number = 0, session?: ClientSession): Promise<IMessage[]> {
    return Message.find({ accountId, conversationId }).session(session || null).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
  }

  static async findManyWithCursor(
    accountId: string,
    conversationId: string,
    limit: number,
    cursor: { createdAt: string; id: string } | null,
    session?: ClientSession
  ): Promise<IMessage[]> {
    const filter: any = { accountId, conversationId };
    
    // Keyset pagination: ordered by createdAt desc, _id desc
    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        { 
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id } 
        }
      ];
    }
    
    return Message.find(filter)
      .session(session || null)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
  }

  static async create(data: Partial<IMessage>, session?: ClientSession): Promise<IMessage> {
    const msg = new Message(data);
    return msg.save({ session });
  }

  // Idempotent upsert logic that mirrors the webhook requirements:
  // We need to know if the message was actually created so we can short-circuit side effects!
  // We will return { message, created }
  static async upsertByMessageId(accountId: string, conversationId: string, messageId: string, data: Partial<IMessage>): Promise<IMessage> {
    const { message } = await this.upsertWebhookMessage(accountId, conversationId, messageId, data);
    return message;
  }
  
  static async upsertWebhookMessage(accountId: string, conversationId: string, messageId: string, data: Partial<IMessage>, session?: ClientSession): Promise<{ message: IMessage, created: boolean }> {
    const safeData = stripProtectedFields(data);
    delete safeData.accountId;
    delete safeData.conversationId;
    delete safeData.messageId;
    delete safeData._id; // prevent setting _id if it exists
    
    const setOnInsert = { accountId, conversationId, messageId };
    if (data._id) {
        (setOnInsert as any)._id = data._id;
    }

    const doc = await Message.findOneAndUpdate(
      { accountId, conversationId, messageId },
      { $set: safeData, $setOnInsert: setOnInsert },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, session, includeResultMetadata: true }
    );
    
        const lastError = (doc as any).lastErrorObject;
    const created = lastError ? !lastError.updatedExisting : true;
    return { message: (doc as any).value as IMessage, created };
  }

  static async updateStatus(accountId: string, id: string, status: IMessage['status'], session?: ClientSession): Promise<IMessage | null> {
    return Message.findOneAndUpdate({ _id: id, accountId }, { $set: { status } }, { returnDocument: 'after', session }).lean();
  }

  static async setReaction(
    accountId: string,
    id: string,
    actorType: 'customer' | 'agent',
    actorId: string | undefined,
    emoji: string,
    session?: ClientSession
  ): Promise<IMessage | null> {
    // We want to upsert the reaction. MongoDB doesn't have a single $upsert inside an array easily.
    // Instead we pull any existing reaction by this actor, then push if emoji is non-empty.
    // A two-step update on the same document is safe in a transaction or if we just accept
    // the minor race condition of pull then push (which is fine for reactions).
    // Or we can do it via find, modify, and save.
    const msg = await Message.findOne({ _id: id, accountId }).session(session || null);
    if (!msg) return null;

    if (!msg.reactions) msg.reactions = [];

    // Remove existing reaction from this actor
    const existingIdx = msg.reactions.findIndex(
      r => r.actorType === actorType && (r.actorId === actorId || (!r.actorId && !actorId))
    );

    if (existingIdx >= 0) {
      if (emoji) {
        msg.reactions[existingIdx].emoji = emoji;
        msg.reactions[existingIdx].createdAt = new Date();
      } else {
        msg.reactions.splice(existingIdx, 1);
      }
    } else if (emoji) {
      msg.reactions.push({ emoji, actorType, actorId, createdAt: new Date() });
    }

    return msg.save({ session });
  }
}
