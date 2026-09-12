// ============================================================
// POST /api/invitations/[token]/redeem
//
// Authenticated. Caller atomically moves from their personal
// account (created at signup) to the inviter's account with the
// invite's role. Heavy lifting lives in InvitationService.
//
// Refusal contract:
//   - 42501 -> 401 (caller not authenticated)
//   - 22023 -> 400 (invitation not_found / used / expired)
//   - 23505 -> 409 (caller's account already has data /
//     they're already in this or another shared account)
//
// Rate limit (per IP) is the same shape as peek but tighter.
// ============================================================

import { NextResponse } from "next/server";
import { hashInviteToken } from "@/lib/auth/invitations";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`redeem:${ip}`, RATE_LIMITS.invitationRedeem);
  if (!limit.success) return rateLimitResponse(limit);

  const { token } = await params;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing invitation token" }, { status: 400 });
  }

  let accountId_ctx: string;
  let userId: string;
  try {
    const { getCurrentAccount } = await import('@/lib/auth/account');
    const ctx = await getCurrentAccount();
    accountId_ctx = ctx.accountId;
    userId = ctx.userId;
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { InvitationService } = await import('@/lib/auth/invitation-service');
  let accountId;
  try {
    accountId = await InvitationService.redeem(userId, hashInviteToken(token));
  } catch (err: any) {
    const message = err.message || '';
    if (message.startsWith('42501:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 401 });
    }
    if (message.startsWith('22023:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 400 });
    }
    if (message.startsWith('23505:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 409 });
    }
    console.error("[redeem] unexpected error:", err);
    return NextResponse.json({ error: "Failed to redeem invitation" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accountId });
}
