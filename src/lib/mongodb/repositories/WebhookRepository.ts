import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { ContactRepository } from './ContactRepository';
import { ConversationRepository } from './ConversationRepository';
import { MessageRepository } from './MessageRepository';
import crypto from 'crypto';

export class WebhookRepository {
  /**
   * Performs the entire inbound webhook database persistence in a single logical transaction.
   * Includes Contact resolution/creation, Conversation resolution/creation, Message idempotency/insert,
   * and Conversation metadata bump + reopen.
   */
  static async processInboundWebhook(
    accountId: string,
    senderPhone: string,
    contactName: string,
    messageId: string,
    messageData: any, // Contains contentType, contentText, mediaUrl, etc.
    configOwnerUserId: string
  ) {
    const session = await mongoose.startSession();
    let result: any;

    try {
      await session.withTransaction(async (session) => {
        // 1. Resolve or Create Contact
        let contact = await ContactRepository.findByPhone(accountId, senderPhone, session);
        let contactWasCreated = false;
        
        if (contact) {
          if (contactName && contactName !== contact.name) {
            contact = await ContactRepository.updateById(accountId, contact._id, { name: contactName }, session);
          }
        } else {
          try {
            contact = await ContactRepository.create({
              _id: crypto.randomUUID(),
              accountId,
              phone: senderPhone,
              name: contactName || senderPhone,
            }, session);
            contactWasCreated = true;
          } catch (createError: any) {
            if (createError.code === 11000) {
              contact = await ContactRepository.findByPhone(accountId, senderPhone, session);
              if (!contact) throw new Error('Contact race condition failed resolution');
            } else {
              throw createError;
            }
          }
        }

        if (!contact) throw new Error('Failed to resolve contact');

        // 2. Resolve or Create Conversation
        // Mongoose findOneAndUpdate with upsert behaves atomically
        let conversation = await ConversationRepository.findByContactId(accountId, contact._id, session);
        let conversationWasCreated = false;

        if (!conversation) {
           const { Conversation } = await import('../models/Conversation');
           const convUpdate = await Conversation.findOneAndUpdate(
             { accountId, contactId: contact._id },
             { 
               $setOnInsert: { 
                 _id: crypto.randomUUID(),
                 accountId, 
                 contactId: contact._id,
                 userId: configOwnerUserId,
                                  unreadCount: 0,
                 status: 'open'
               } 
             },
             { upsert: true, new: true, session, includeResultMetadata: true }
           );
           
           if (!convUpdate) throw new Error('Failed to upsert conversation');
           // Mongoose rawResult might return { value: doc } or just doc in some versions.
           conversation = (convUpdate as any).value || convUpdate as any;
           if (!conversation || !conversation._id) {
                              throw new Error('Failed to get conversation from convUpdate');
           }
           const lastError = (convUpdate as any).lastErrorObject;
           conversationWasCreated = lastError ? !lastError.updatedExisting : true;
        }

        // 3. Message Idempotency & Insertion
        const { message, created: messageWasCreated } = await MessageRepository.upsertWebhookMessage(
          accountId,
          conversation!._id,
          messageId,
          {
            _id: crypto.randomUUID(),
            ...messageData,
            senderType: 'customer',
            status: 'delivered',
            createdAt: messageData.createdAt || new Date()
          },
          session
        );

        // If it's a replay, short circuit here inside the transaction
        if (!messageWasCreated) {
           result = {
             contact,
             contactWasCreated: false, // Don't re-trigger downstream
             conversation,
             conversationWasCreated: false,
             message,
             messageWasCreated: false
           };
           return; 
        }

        // 4. Conversation Metadata Update (Bump & Reopen)
        // Atomic update of unread count, last message text, and reopening if closed
        const lastMsgText = messageData.contentText || `[${messageData.contentType}]`;
        
        conversation = await ConversationRepository.processInbound(
          accountId,
          conversation!._id,
          lastMsgText,
          session
        );

        result = {
          contact,
          contactWasCreated,
          conversation,
          conversationWasCreated,
          message,
          messageWasCreated
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  }
}
