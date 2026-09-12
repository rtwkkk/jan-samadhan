import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { sendReactionMessage } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

import { connectToDatabase } from '@/lib/mongodb/client';
import { MessageRepository } from '@/lib/mongodb/repositories/MessageRepository';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import { Contact } from '@/lib/mongodb/models/Contact';

/**
 * POST /api/whatsapp/react
 *
 * Body: { message_id: <internal UUID>, emoji: <single emoji or "" to remove> }
 *
 * Sends the reaction to Meta and mirrors it into MongoDB `reactions` array.
 */
export async function POST(request: Request) {
  try {
    const { accountId, userId } = await requireRole('agent');

    const limit = checkRateLimit(`react:${userId}`, RATE_LIMITS.react);
    if (!limit.success) {
      return rateLimitResponse(limit);
    }

    const body = await request.json();
    const { message_id, emoji } = body as {
      message_id?: string;
      emoji?: string;
    };

    if (!message_id || typeof emoji !== 'string') {
      return NextResponse.json(
        { error: 'message_id and emoji are required' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Resolve target message
    const targetMessage = await MessageRepository.findById(accountId, message_id);

    if (!targetMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (!targetMessage.messageId) {
      // No Meta ID yet — usually a sending/failed agent message.
      return NextResponse.json(
        { error: 'Cannot react to a message that has not been sent to WhatsApp' },
        { status: 400 },
      );
    }

    const conversation = await Conversation.findOne({ _id: targetMessage.conversationId, accountId }).lean();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    const contact = await Contact.findOne({ _id: conversation.contactId, accountId }).lean();
    if (!contact?.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 400 },
      );
    }

    // TODO: Phase 4 - Move whatsapp_config to MongoDB. For now, fetch from Supabase.
    // Wait, the prompt says "Do NOT add/reintroduce Supabase."
    // But whatsapp_config was already migrated to MongoDB in Phase 3 Step 1!
    // Let's use WhatsappConfigRepository.
    const { WhatsappConfigRepository } = await import('@/lib/mongodb/repositories/WhatsappConfigRepository');
    const config = await WhatsappConfigRepository.findByAccountId(accountId);

    if (!config || !config.accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp not configured.' },
        { status: 400 },
      );
    }

    const accessToken = decrypt(config.accessToken);
    const sanitizedPhone = sanitizePhoneForMeta(contact.phone);

    try {
      await sendReactionMessage({
        phoneNumberId: config.phoneNumberId,
        accessToken,
        to: sanitizedPhone,
        targetMessageId: targetMessage.messageId,
        emoji,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error('[whatsapp/react] Meta send failed:', message);
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 502 },
      );
    }

    // Mirror into DB. Empty emoji = removal.
    try {
      await MessageRepository.setReaction(
        accountId,
        targetMessage._id,
        'agent',
        userId,
        emoji
      );
    } catch (err) {
      console.error('[whatsapp/react] DB update failed:', err);
      return NextResponse.json(
        { error: 'Reaction sent to Meta but DB update failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in WhatsApp react POST:', error);
    return toErrorResponse(error);
  }
}
