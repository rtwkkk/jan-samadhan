import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';
import { startOfLocalDay, daysAgoStart } from '@/lib/dashboard/date-utils';

export async function GET(request: Request) {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'stats') {
      const todayStart = startOfLocalDay().toISOString();
      const yesterdayStart = daysAgoStart(1).toISOString();

      const [contactsToday, contactsYesterday] = await Promise.all([
        ContactRepository.countSince(ctx.accountId, todayStart),
        ContactRepository.count(ctx.accountId, {
          createdAt: {
            $gte: new Date(yesterdayStart),
            $lt: new Date(todayStart),
          },
        }),
      ]);

      return NextResponse.json({
        contactsToday,
        contactsYesterday,
      });
    }

    if (action === 'recent') {
      const recent = await ContactRepository.recentContacts(ctx.accountId, 10);
      return NextResponse.json(
        recent.map((c) => ({
          id: c._id,
          name: c.name,
          phone: c.phone,
          created_at: c.createdAt ? c.createdAt.toISOString() : null,
        }))
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
