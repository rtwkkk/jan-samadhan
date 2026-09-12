// ============================================================
// GET /api/v1/conversations — list conversations (scope: conversations:read)
//
// Keyset-paginated (newest first). Filters: `?status=` (open/pending/
// closed) and `?contact_id=`. Each conversation embeds its contact +
// tags via the shared CONVERSATION_SELECT.
// ============================================================

import { requireApiAuth } from '@/lib/auth/api-context';
import { okList, toApiErrorResponse } from '@/lib/api/v1/respond';
import { parseListParams, buildPage } from '@/lib/api/v1/pagination';
import { serializeConversation } from '@/lib/api/v1/conversations';
import type { Conversation as AppConversation } from '@/types';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import '@/lib/mongodb/models/Contact';

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request, 'conversations:read');
    const { limit, cursor } = parseListParams(request);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const contactId = url.searchParams.get('contact_id');

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (contactId) filter.contactId = contactId;

    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        { 
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id } 
        }
      ];
    }

    await connectToDatabase();
    
    // We request limit + 1 to know if there's a next page
    const conversations = await Conversation.find({ ...filter, accountId: ctx.accountId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('contactId')
      .lean();

    // Map Mongo shape back to the API format
    const rows = conversations.map(c => {
      const contact = c.contactId as any; // populated
      const tags = (contact?.tagIds || []).map((id: string) => ({ id })); // minimal shape required by normalization or serialize
      return {
        id: c._id,
        account_id: c.accountId,
        contact_id: contact?._id ?? (c.contactId as unknown as string),
        status: c.status,
        unread_count: c.unreadCount,
        last_message_text: c.lastMessageText,
        last_message_at: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
        created_at: new Date(c.createdAt).toISOString(),
        updated_at: new Date(c.updatedAt).toISOString(),
        contact: contact ? {
          id: contact._id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          tags,
          created_at: contact.createdAt ? new Date(contact.createdAt).toISOString() : null
        } : null
      };
    });

    const { items, nextCursor } = buildPage(rows as any[], limit);
    return okList(items.map((r) => serializeConversation(r as unknown as AppConversation)), nextCursor);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
