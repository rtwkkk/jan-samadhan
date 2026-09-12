import { NextResponse } from 'next/server';
import { getSessionFromRequest, revokeSession, clearSessionCookie } from '@/lib/auth/server';

export async function POST() {
  try {
    const rawToken = await getSessionFromRequest();
    if (rawToken) {
      await revokeSession(rawToken);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
