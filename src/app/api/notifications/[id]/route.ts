import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { NotificationRepository } from '@/lib/mongodb/repositories/NotificationRepository';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    if ((await params).id === 'all') {
      await NotificationRepository.markAllAsRead(ctx.accountId, ctx.userId);
    } else {
      await NotificationRepository.markAsRead(ctx.accountId, ctx.userId, (await params).id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
