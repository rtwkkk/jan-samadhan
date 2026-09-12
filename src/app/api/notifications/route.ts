import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { NotificationRepository } from '@/lib/mongodb/repositories/NotificationRepository';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const notifications = await NotificationRepository.findByUser(ctx.accountId, ctx.userId, 100);

    return NextResponse.json(notifications.map(n => ({
      id: n._id,
      account_id: n.accountId,
      user_id: n.userId,
      type: n.type,
      conversation_id: n.conversationId || undefined,
      contact_id: n.contactId || undefined,
      actor_user_id: n.actorUserId || undefined,
      title: n.title,
      body: n.body || undefined,
      read_at: n.readAt ? n.readAt.toISOString() : null,
      created_at: n.createdAt.toISOString()
    })));
  } catch (err) {
    return toErrorResponse(err);
  }
}
