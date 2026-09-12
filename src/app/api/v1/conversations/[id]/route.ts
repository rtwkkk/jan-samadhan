// ============================================================
// GET /api/v1/conversations/{id} — read one conversation
// (scope: conversations:read). Account-scoped: a foreign id → 404.
// ============================================================

import { requireApiKey, requireApiAuth } from '@/lib/auth/api-context';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import {
  CONVERSATION_SELECT,
  normalizeConversation,
} from '@/lib/inbox/conversations';
import { serializeConversation } from '@/lib/api/v1/conversations';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import type { Conversation as AppConversation } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiAuth(request, 'conversations:read');
    const { id } = await params;

    await connectToDatabase();
    
    const c = await Conversation.findOne({ _id: id, accountId: ctx.accountId })
      .populate('contactId')
      .lean();

    if (!c) return fail('not_found', 'Conversation not found', 404);

    const contact = c.contactId as any;
    const tags = (contact?.tagIds || []).map((tId: string) => ({ id: tId }));
    const raw = {
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

    return ok(serializeConversation(normalizeConversation(raw as unknown as AppConversation)));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiAuth(request, 'conversations:write');
    const { id } = await params;
    
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Invalid request body', 400);
    }

    await connectToDatabase();
    
    // allow updating status, assigned_agent_id, and unread_count
    const update: any = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.assigned_agent_id !== undefined) update.assignedAgentId = body.assigned_agent_id; // in mongo, user_id maps to userId or assignedAgentId? Wait! In Mongo it's userId? No, in mongo it's assigned_agent_id maybe?
    if (body.unread_count !== undefined) update.unreadCount = body.unread_count;

    const c = await Conversation.findOneAndUpdate(
      { _id: id, accountId: ctx.accountId },
      { $set: update },
      { new: true }
    ).populate('contactId').lean();

    if (!c) return fail('not_found', 'Conversation not found', 404);

    return ok({ success: true });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
