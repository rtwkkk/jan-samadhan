// ============================================================
// GET /api/v1/conversations/{id}/messages — list a conversation's
// messages (scope: messages:read), newest first, keyset-paginated.
//
// The conversation is verified to belong to the key's account before
// any message is returned — a foreign or unknown id → 404.
// ============================================================

import { requireApiAuth } from '@/lib/auth/api-context';
import { okList, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import {
  parseListParams,
  buildPage,
} from '@/lib/api/v1/pagination';
import { serializeMessage } from '@/lib/api/v1/conversations';
import type { Message } from '@/types';

import { connectToDatabase } from '@/lib/mongodb/client';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import { MessageRepository } from '@/lib/mongodb/repositories/MessageRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiAuth(request, 'messages:read');
    const { id } = await params;
    const { limit, cursor } = parseListParams(request);

    await connectToDatabase();

    // Gate on account ownership of the conversation first.
    const conv = await Conversation.findOne({ _id: id, accountId: ctx.accountId }).lean();
    if (!conv) return fail('not_found', 'Conversation not found', 404);

    const messages = await MessageRepository.findManyWithCursor(
      ctx.accountId,
      id,
      limit + 1, // request one extra for pagination
      cursor
    );

    // Map Mongo shape back to the API format expected by frontend
    const rows = messages.map(m => ({
      id: m._id,
      account_id: m.accountId,
      conversation_id: m.conversationId,
      sender_type: m.senderType,
      sender_id: m.senderId,
      content_type: m.contentType,
      content_text: m.contentText,
      media_url: m.media?.url ?? null,
      message_id: m.messageId,
      status: m.status,
      created_at: new Date(m.createdAt).toISOString(),
      updated_at: new Date(m.updatedAt).toISOString(),
      reactions: (m.reactions || []).map((r: any) => ({
        id: String(Math.random()), // reactions in mongo don't have unique ids, mock one if needed
        message_id: m._id,
        conversation_id: m.conversationId,
        actor_type: r.actorType,
        actor_id: r.actorId,
        emoji: r.emoji,
        created_at: new Date(r.createdAt || m.createdAt).toISOString()
      }))
    }));

    const { items, nextCursor } = buildPage(rows as any[], limit);
    return okList(items.map((m) => serializeMessage(m as unknown as Message)), nextCursor);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
