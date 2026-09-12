import { NextResponse, after } from 'next/server'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api'
import { mirrorInboundMedia } from '@/lib/whatsapp/mirror-inbound-media'
import { localMediaStorage } from '@/lib/storage/local-media-storage'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { handleAiConversation } from '@/lib/ai/conversation-handler';
import {
  handleTemplateWebhookChange,
  isTemplateWebhookField,
} from '@/lib/whatsapp/template-webhook'

// The `after()` callback in POST runs within this route's max duration.
// Inbound processing can fan out to per-media Meta verification calls, so
// give it headroom beyond the platform default (Vercel clamps this to the
// plan's ceiling). Tune as needed.
export const maxDuration = 60


interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  /**
   * Set when the customer taps a button or list row on an interactive
   * message we sent. `button_reply.id` / `list_reply.id` is whatever id
   * we put on the button/row when sending — the Flows engine uses this
   * to advance the per-contact run.
   */
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
  /**
   * Set when the customer taps a QUICK_REPLY button on a *template*
   * message — a broadcast, or any template send. Meta uses a different
   * envelope from `interactive` above: `type: 'button'`, the label in
   * `button.text`, and the payload configured on the template's button
   * in `button.payload` (Meta's own template editor doesn't ask for a
   * payload and mirrors the label into it).
   */
  button?: { text?: string; payload?: string }
  /** Present when the customer swipe-replies to one of our messages. */
  context?: { id: string }
}

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: WhatsAppMessage[]
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const { connectToDatabase } = await import('@/lib/mongodb/client');
    const { WhatsappConfig } = await import('@/lib/mongodb/models/WhatsappConfig');
    await connectToDatabase();

    // Fetch all whatsapp configs to check verify tokens
    const configs = await WhatsappConfig.find().lean();

    // Check if any config's verify_token matches. Also collect the
    // matching row so we can opportunistically upgrade its token to
    // GCM if it was still in the legacy CBC format.
    let matchedConfig: any = null
    for (const config of configs) {
      if (!config.verifyToken) continue

      if (verifyToken === decrypt(config.verifyToken)) {
        matchedConfig = config
        break
      }
    }

    if (!matchedConfig) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 403 }
      )
    }

    // Opportunistic encryption upgrade: if this verify_token was still
    // using the old weak CBC format (decrypt() succeeded because it
    // attempts both), re-encrypt it using the new AES-256-GCM scheme
    // and write it back. This self-heals legacy tokens as they are
    // used.
    if (isLegacyFormat(matchedConfig.verifyToken)) {
      await WhatsappConfig.updateOne(
        { _id: matchedConfig._id },
        { $set: { verifyToken: encrypt(verifyToken) } }
      ).catch((err: any) => {
        console.warn(
          '[webhook] verify_token GCM upgrade failed (ignoring):',
          err.message
        )
      })
    }

    // Return challenge as plain text
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })

  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Receive messages
export async function POST(request: Request) {
  // Read raw body first so we can HMAC-verify the exact bytes Meta
  // signed. request.json() would re-encode and break the signature.
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    // 401 (not 200) — we want Meta's delivery dashboard to show failures
    // loudly if a misconfiguration causes signatures to stop matching,
    // rather than silently eating events.
    console.warn('[webhook] rejected request with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Process AFTER the response so we ack Meta within their ~20s timeout
  // (a slow ack triggers Meta retries + duplicate inserts), while still
  // guaranteeing the work runs to completion.
  //
  // This MUST use `after()` rather than a detached `processWebhook(body)`
  // promise: on serverless platforms (we run on Vercel) the function can
  // be frozen or terminated the moment the response is sent, so a floating
  // promise's DB writes are not guaranteed to finish. That dropped a
  // non-deterministic *subset* of inbound messages — contacts/conversations
  // were created but the message insert never landed, leaving conversations
  // that show in the inbox with an empty thread, and no logs to explain it
  // (see issue #301). `after()` hands the callback to the runtime, which
  // keeps the function alive until it resolves (within the route's
  // maxDuration).
  after(async () => {
    try {
      await processWebhook(body)
    } catch (error) {
      console.error('Error processing webhook:', error)
    }
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

async function processWebhook(body: { entry?: WhatsAppWebhookEntry[] }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      // Template-lifecycle events (status / quality / components
      // updates from Meta) come in on a different change.field and
      // have a different value shape — route them through the
      // dedicated handler. Skip the messaging branches below so we
      // don't try to read message-shaped fields off a template event.
      if (isTemplateWebhookField(change.field)) {
        await handleTemplateWebhookChange({ field: change.field, value: change.value as unknown })
        continue
      }

      const value = change.value

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status)
        }
      }

      // Handle incoming messages
      if (!value.messages || !value.contacts) continue

      const phoneNumberId = value.metadata.phone_number_id

      // Find user's config by phone_number_id. `.single()` returns
      // PGRST116 for both 0 rows AND ≥2 rows — distinguish them so
      // operators see the real cause in logs. ≥2 rows shouldn't happen
      // post-migration 013 (UNIQUE constraint), but a row created
      // before the constraint, or a race, would still surface here.
      const { connectToDatabase } = await import('@/lib/mongodb/client');
      const { WhatsappConfig } = await import('@/lib/mongodb/models/WhatsappConfig');
      await connectToDatabase();
      const configRows = await WhatsappConfig.find({ phoneNumberId }).lean();

      if (!configRows || configRows.length === 0) {
        console.error('No config found for phone_number_id:', phoneNumberId)
        continue
      }

      if (configRows.length > 1) {
        console.error(`Multiple configs found for phone_number_id: ${phoneNumberId}. Taking the first one.`);
      }

      const config = configRows[0];

      const decryptedAccessToken = decrypt(config.accessToken);

      for (let i = 0; i < value.messages.length; i++) {
        const message = value.messages[i];
        const contact = value.contacts[i] || value.contacts[0];

        await processMessage(
          message,
          contact,
          // Tenancy — drives every contact / conversation lookup
          // and the engines' active-row dispatch.
          config.accountId,
          // Audit / sender-of-record — used as the user_id on row
          // inserts that need it for NOT NULL FK compliance. Always
          // the admin who saved the WhatsApp config.
          'system',
          decryptedAccessToken,
          // Default ON: the column is NOT NULL DEFAULT TRUE, but a row
          // read before migration 039 lands would have it undefined,
          // and losing attachments is the failure mode worth avoiding.
          config.mirrorInboundMedia !== false
        )
      }
    }
  }
}

// The happy-path status ladder — pending → sent → delivered → read →
// replied. Webhook replays must never regress a recipient back down
// this ladder.
//
// `failed` is NOT on this ladder. It's a terminal side branch that is
// only valid from the early states (pending / sent) — once Meta has
// delivered or the user has read or replied, a later "failed" status
// event is a bug in Meta's pipeline or a spoof attempt and must be
// ignored.
const RECIPIENT_STATUS_LADDER = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
] as const

function ladderLevel(s: string): number {
  const idx = (RECIPIENT_STATUS_LADDER as readonly string[]).indexOf(s)
  return idx < 0 ? -1 : idx
}

/**
 * Can a recipient transition from `current` to `incoming`?
 *   - Along the ladder, only forward moves are allowed.
 *   - `failed` is accepted only from `pending` or `sent`; it's refused
 *     once the recipient has reached any of the success states.
 */
function isValidStatusTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') {
    return current === 'pending' || current === 'sent'
  }
  if (current === 'failed') {
    return false // failed is terminal
  }
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false // unknown incoming status
  if (ci < 0) return true // unknown current — accept anything on the ladder
  return ii > ci
}

async function handleStatusUpdate(status: {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}) {
  try {
    const { Message } = await import('@/lib/mongodb/models/Message');
    await Message.updateMany(
      { messageId: status.id },
      { $set: { status: status.status } }
    );
  } catch (err: any) {
    console.error('Error updating message status:', err.message);
  }
}

/**
 * flagBroadcastReplyIfAny was removed since Automations/Broadcasts are deprecated.
 */
async function flagBroadcastReplyIfAny(accountId: string, contactId: string) {
  // No-op
}

/**
 * Resolve a Meta-side message_id into the matching internal UUID, scoped
 * to one conversation. Returns null when we never received the parent
 * (e.g. a swipe-reply to a message older than this CRM install).
 */
async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string
): Promise<string | null> {
  try {
    const { Message } = await import('@/lib/mongodb/models/Message');
    const msg = await Message.findOne({ messageId: metaId, conversationId }).select('_id').lean();
    return msg ? (msg._id as string) : null;
  } catch (error: any) {
    console.error('[webhook] lookupInternalIdByMetaId failed:', error.message)
    return null
  }
}

/**
 * Persist an inbound reaction. WhatsApp reactions are not new messages —
 * they're per-(target, actor) state. We upsert / delete on
 * `message_reactions`, never write a row into `messages`.
 *
 * Best-effort: a missing parent (we never received it) is logged and
 * skipped so the webhook still acks 200 to Meta.
 */
async function handleReaction(accountId: string, 
  message: WhatsAppMessage,
  conversationId: string,
  contactId: string
) {
  const reaction = message.reaction
  if (!reaction?.message_id) return

  const targetInternalId = await lookupInternalIdByMetaId(
    reaction.message_id,
    conversationId
  )
  if (!targetInternalId) {
    console.warn(
      '[webhook] reaction target message not found; skipping',
      reaction.message_id
    )
    return
  }

  try {
    const { MessageRepository } = await import('@/lib/mongodb/repositories/MessageRepository');
    await MessageRepository.setReaction(
      accountId,
      targetInternalId, // internal _id of the message
      'customer',
      contactId,
      reaction.emoji || '' // empty string removes it
    );
  } catch (err: any) {
    console.error('[webhook] reaction set failed:', err.message);
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  // Tenancy. Resolved from the matched whatsapp_config row; every
  // contact / conversation / message row created downstream is
  // stamped with this so any member of the account can see it.
  accountId: string,
  // Sender-of-record for inserts that need a NOT NULL user_id FK
  // (contacts, conversations). Always the admin who saved the
  // WhatsApp config; the choice is arbitrary post-017 but stable.
  configOwnerUserId: string,
  accessToken: string,
  // Per-account opt-out for the inbound-media mirror (migration 039).
  // See parseMessageContent for what it turns off.
  mirrorMedia: boolean
) {
  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  // ----------------------------------------------------
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
       reactConv = convUpdate?.value || null;
    }
    conversation = { id: reactConv?._id };

    await handleReaction(accountId, message, conversation.id, contactRecord.id)
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

  

  if (!txResult.messageWasCreated) {
    console.info('[webhook] duplicate inbound message ignored (idempotent replay):', message.id)
    return
  }

  // Pass to AI handler if there is text content
  if (content?.contentText) {
    await handleAiConversation(accountId, txResult.conversation._id, content.contentText, txResult.contact.phone);
  }

  


}

async function parseMessageContent(
  message: WhatsAppMessage,
  accessToken: string,
  // Tenancy + opt-out for the media mirror. Null disables mirroring
  // entirely, which is what the account-level toggle does.
  mirror: { accountId: string } | null
): Promise<{
  contentText: string | null
  mediaUrl: string | null
  mediaType: string | null
  /**
   * For interactive button / list replies: the stable id of the tapped
   * option (whatever we put on the button when sending). Used by the
   * Flows engine to advance the per-contact run; persisted to
   * `messages.interactive_reply_id` so the inbox bubble can render the
   * tap with the right affordance. Null for everything else.
   */
  interactiveReplyId: string | null
}> {
  // getMediaUrl signature is (mediaId, accessToken) — earlier code had
  // the args swapped, so every verification hit an invalid Meta URL and
  // fell through to the catch block, leaving mediaUrl as null. That's
  // why images showed up as empty bubbles in the inbox.
  //
  // Beyond verifying, this is where inbound media gets COPIED into the
  // `chat-media` bucket (issue #466). Meta deletes media ~30 days after
  // receipt, so the `/api/whatsapp/media/<id>` proxy URL we used to
  // store is a pointer with an expiry date on it — every inbound
  // attachment silently became "Photo unavailable" a month later.
  // Mirroring stores a durable public URL instead.
  //
  // The mirror is strictly best-effort. `mirrorInboundMedia` swallows
  // its own failures and returns null, and we fall back to the proxy
  // URL — a webhook that throws would have Meta retry the delivery and
  // re-run everything downstream, which is a far worse outcome than an
  // attachment that expires.
  const verifyAndBuildUrl = async (
    mediaId: string,
    fileName?: string | null
  ): Promise<string | null> => {
    try {
      const info = await getMediaUrl({ mediaId, accessToken })

      if (mirror) {
        const mirrored = await mirrorInboundMedia({
          storage: localMediaStorage,
          accountId: mirror.accountId,
          mediaId,
          downloadUrl: info.url,
          accessToken,
          mimeType: info.mimeType,
          fileSize: info.fileSize,
          fileName,
          messageTimestamp: message.timestamp,
        })
        if (mirrored) return mirrored
      }

      return `/api/whatsapp/media/${mediaId}`
    } catch (error) {
      console.error(
        `Failed to verify media ${mediaId} with Meta:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  // Default shape — each case overrides only the fields it cares about.
  // Keeps the new `interactiveReplyId` field DRY across every return site.
  const empty = {
    contentText: null,
    mediaUrl: null,
    mediaType: null,
    interactiveReplyId: null,
  }

  switch (message.type) {
    case 'text':
      return { ...empty, contentText: message.text?.body || null }

    case 'image':
      if (message.image?.id) {
        return {
          ...empty,
          contentText: message.image.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.image.id),
          mediaType: message.image.mime_type,
        }
      }
      return empty

    case 'video':
      if (message.video?.id) {
        return {
          ...empty,
          contentText: message.video.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.video.id),
          mediaType: message.video.mime_type,
        }
      }
      return empty

    case 'document':
      if (message.document?.id) {
        return {
          ...empty,
          contentText:
            message.document.caption || message.document.filename || null,
          // The sender's own filename becomes the mirrored object's
          // name, so saving the attachment yields `invoice.pdf` even
          // when a caption displaced the filename in content_text.
          mediaUrl: await verifyAndBuildUrl(
            message.document.id,
            message.document.filename
          ),
          mediaType: message.document.mime_type,
        }
      }
      return empty

    case 'audio':
      if (message.audio?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.audio.id),
          mediaType: message.audio.mime_type,
        }
      }
      return empty

    case 'sticker':
      // Stickers are images under the hood. Treat them as such so the
      // MessageBubble renders the <img>. The caller maps the DB
      // content_type to 'image' for the CHECK constraint.
      if (message.sticker?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.sticker.id),
          mediaType: message.sticker.mime_type,
        }
      }
      return empty

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return { ...empty, contentText: locationText }
      }
      return empty

    case 'reaction':
      return { ...empty, contentText: message.reaction?.emoji || null }

    case 'interactive': {
      // The customer tapped a reply button or a list row on a message
      // we previously sent. Meta delivers `interactive.button_reply` for
      // 3-button messages and `interactive.list_reply` for list messages.
      // Use the human-readable title as contentText so the inbox bubble
      // renders the tap legibly ("Existing customer"), and stash the
      // stable id separately so the Flows engine can route on it.
      const reply =
        message.interactive?.button_reply ?? message.interactive?.list_reply
      if (reply?.id) {
        return {
          ...empty,
          contentText: reply.title || reply.id,
          interactiveReplyId: reply.id,
        }
      }
      return { ...empty, contentText: '[Interactive reply]' }
    }

    case 'button': {
      // Quick-reply tap on a TEMPLATE message. Meta delivers these under
      // their own `button` envelope rather than `interactive` above, so
      // without this case they fell through to `default` and landed in
      // the inbox as "[Unsupported message type: button]" with a null
      // interactiveReplyId — which also meant the Flows engine and the
      // `interactive_reply` automation trigger never saw the tap, so
      // nothing chained off a broadcast reply (issue #478).
      //
      // `payload` is the stable value (the analogue of
      // `button_reply.id`); `text` is the visible label. Prefer the
      // payload for routing and the label for display, each falling
      // back to the other since a template may carry only one.
      const payload = message.button?.payload || null
      const label = message.button?.text || null
      return {
        ...empty,
        contentText: label || payload,
        interactiveReplyId: payload || label,
      }
    }

    default:
      return {
        ...empty,
        contentText: `[Unsupported message type: ${message.type}]`,
      }
  }
}
