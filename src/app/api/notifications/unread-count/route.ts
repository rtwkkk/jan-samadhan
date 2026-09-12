import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { NotificationRepository } from '@/lib/mongodb/repositories/NotificationRepository';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const count = await NotificationRepository.countUnread(ctx.accountId, ctx.userId);
    return NextResponse.json({ count });
  } catch (err) {
    return toErrorResponse(err);
  }
}
