import { NextResponse } from 'next/server';

/**
 * POST /api/auth/forgot-password
 *
 * Placeholder for MongoDB-native password reset.
 * Email delivery infrastructure has not been configured yet,
 * so this returns a success response to avoid leaking whether
 * the email exists, but does not actually send anything.
 *
 * TODO (Phase 3+): Integrate an email provider (e.g. Resend, SES)
 * and implement a secure token-based reset flow stored in MongoDB.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Always return success to prevent email enumeration.
  // In production, this would generate a reset token, store it in MongoDB,
  // and send the user an email with the reset link.
  return NextResponse.json({ success: true });
}
