const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/webhook/route.ts', 'utf8');

// We will replace the body of processMessage from "Find or create contact" down to "flagBroadcastReplyIfAny"

const matchStart = "// Find or create contact";
const matchEnd = "await flagBroadcastReplyIfAny(accountId, contactRecord.id)";

const startIdx = code.indexOf(matchStart);
const endIdx = code.indexOf(matchEnd) + matchEnd.length;

const replacement = `// ----------------------------------------------------
  // MongoDB Transaction Migration: Contact + Conversation + Message + Bump
  // ----------------------------------------------------
  let replyToInternalId: string | null = null
  if (message.type !== 'reaction' && message.context?.id) {
    // Note: lookupInternalIdByMetaId relies on PostgreSQL for now, but we'll leave it as is 
    // or provide a temporary fallback if it fails since we haven't migrated everything yet.
    // The prompt says "Remove the Supabase/PostgreSQL database operations ONLY where MongoDB now provides the equivalent behavior."
    // Since we are migrating Message writes, we should look it up from Mongo if we can, but let's keep the existing call for safety 
    // since the function wasn't explicitly asked to be rewritten and it doesn't break the transaction constraints.
  }

  // Parse message content based on type BEFORE the transaction (keeps network/IO outside)
  const content = message.type !== 'reaction' ? await parseMessageContent(
    message,
    accessToken,
    mirrorMedia ? { accountId } : null
  ) : null;

  if (content && message.context?.id) {
     const { MessageRepository } = await import('@/lib/mongodb/repositories/MessageRepository');
     const { Message } = await import('@/lib/mongodb/models/Message');
     // Try to resolve it from Mongo first, fallback to Postgres
     const mongoMsg = await Message.findOne({ messageId: message.context.id, accountId }).lean();
     if (mongoMsg) {
       replyToInternalId = mongoMsg._id as string;
     } else {
       replyToInternalId = await lookupInternalIdByMetaId(message.context.id, null as any); // We don't have conversation.id yet
     }
  }

  const ALLOWED_CONTENT_TYPES = new Set(['text', 'image', 'document', 'audio', 'video', 'location', 'template', 'interactive']);
  const contentType = ALLOWED_CONTENT_TYPES.has(message.type) ? message.type : (message.type === 'sticker' ? 'image' : (message.type === 'button' ? 'interactive' : 'text'));

  const { WebhookRepository } = await import('@/lib/mongodb/repositories/WebhookRepository');
  const { Message } = await import('@/lib/mongodb/models/Message');

  // We need to resolve Contact & Conversation for Reactions as well, 
  // since the handleReaction function needs their IDs.
  // We'll wrap all of this in our WebhookRepository if it's a message, 
  // or just run a simplified resolution for reactions.
  
  let contactRecord: any;
  let conversation: any;
  let contactWasCreated = false;
  let isFirstInboundMessage = false;

  if (message.type === 'reaction') {
    const { connectToDatabase } = await import('@/lib/mongodb/client');
    const { ContactRepository } = await import('@/lib/mongodb/repositories/ContactRepository');
    const { ConversationRepository } = await import('@/lib/mongodb/repositories/ConversationRepository');
    await connectToDatabase();
    
    let reactContact = await ContactRepository.findByPhone(accountId, senderPhone);
    if (!reactContact) {
      reactContact = await ContactRepository.create({ _id: (await import('crypto')).randomUUID(), accountId, phone: senderPhone, name: contactName || senderPhone });
    }
    contactRecord = { id: reactContact._id, phone: reactContact.phone, name: reactContact.name };
    
    let reactConv = await ConversationRepository.findByContactId(accountId, reactContact._id);
    if (!reactConv) {
       const mongoose = (await import('mongoose')).default;
       const convUpdate = await mongoose.connection.collection('conversations').findOneAndUpdate(
         { accountId, contactId: reactContact._id },
         { $setOnInsert: { _id: (await import('crypto')).randomUUID(), accountId, contactId: reactContact._id, userId: configOwnerUserId, createdAt: new Date(), updatedAt: new Date(), unreadCount: 0, status: 'open' } },
         { upsert: true, returnDocument: 'after' }
       );
       reactConv = convUpdate.value;
    }
    conversation = { id: reactConv._id };

    await handleReaction(message, conversation.id, contactRecord.id)
    return
  }

  // Pre-calculate isFirstInboundMessage before insert to mimic exact old behavior
  // (Assuming we can look up the conversation ID first, but we can't easily without breaking atomicity. 
  // We'll just do it inside the transaction or use a separate pre-flight query.)
  // Let's do a quick pre-flight query:
  const { ContactRepository } = await import('@/lib/mongodb/repositories/ContactRepository');
  const { ConversationRepository } = await import('@/lib/mongodb/repositories/ConversationRepository');
  const preContact = await ContactRepository.findByPhone(accountId, senderPhone);
  if (preContact) {
    const preConv = await ConversationRepository.findByContactId(accountId, preContact._id);
    if (preConv) {
       const count = await Message.countDocuments({ conversationId: preConv._id, senderType: 'customer' });
       isFirstInboundMessage = count === 0;
    } else {
       isFirstInboundMessage = true;
    }
  } else {
    isFirstInboundMessage = true;
  }

  const txResult = await WebhookRepository.processInboundWebhook(
      accountId,
      senderPhone,
      contactName,
      message.id,
      {
          contentType,
          contentText: content!.contentText,
          mediaUrl: content!.mediaUrl,
          mediaType: content!.mediaType,
          replyToMessageId: replyToInternalId,
          interactiveReplyId: content!.interactiveReplyId,
          createdAt: new Date(parseInt(message.timestamp) * 1000)
      },
      configOwnerUserId
  );
  
  if (!txResult) return;
  
  contactRecord = { id: txResult.contact._id, phone: txResult.contact.phone, name: txResult.contact.name };
  conversation = { id: txResult.conversation._id, status: txResult.conversation.status };
  contactWasCreated = txResult.contactWasCreated;

  if (txResult.conversationWasCreated) {
    await dispatchWebhookEvent(supabaseAdmin(), accountId, 'conversation.created', {
      conversation_id: conversation.id,
      contact_id: contactRecord.id,
    })
  }

  if (!txResult.messageWasCreated) {
    console.info('[webhook] duplicate inbound message ignored (idempotent replay):', message.id)
    return
  }

  // If this contact was a recent broadcast recipient, flag the reply
  await flagBroadcastReplyIfAny(accountId, contactRecord.id)`;

code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
fs.writeFileSync('src/app/api/whatsapp/webhook/route.ts', code);
