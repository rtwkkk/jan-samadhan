// ============================================================
// POST /api/account/transfer-ownership
//
// Owner only. Atomically:
//   - demotes the current owner to 'admin'
//   - promotes the target member to 'owner'
//   - updates accounts.owner_user_id
//
// The atomic part lives in the `OwnershipService`.
//
// Why a separate endpoint instead of PATCH /members/[userId]?
//   The semantics differ: transfer demotes the current owner as
//   a side-effect and changes the owner_user_id pointer on
//   `accounts`. Making it explicit prevents the "I clicked the
//   role dropdown by mistake" failure mode where an admin would
//   silently hand their account away.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { OwnershipService } from "@/lib/auth/ownership-service";

function serviceErrorToResponse(err: any): NextResponse {
  const message = err.message || '';
  if (message.startsWith("42501:")) {
    return NextResponse.json({ error: message.split(':')[1] }, { status: 403 });
  }
  if (message.startsWith("22023:")) {
    return NextResponse.json({ error: message.split(':')[1] }, { status: 400 });
  }
  console.error("[transfer-ownership] unexpected error:", err);
  return NextResponse.json(
    { error: "Failed to transfer ownership" },
    { status: 500 },
  );
}

function looksLikeUuidOrObjectId(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  
  // Accept standard UUID (since original IDs are UUIDs)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return true;
  
  // Accept MongoDB ObjectId format just in case
  if (/^[0-9a-fA-F]{24}$/.test(v)) return true;
  
  return false;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("owner");

    const limit = checkRateLimit(
      `admin:transferOwnership:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { newOwnerUserId?: unknown }
      | null;
    const newOwnerUserId = body?.newOwnerUserId;

    if (!looksLikeUuidOrObjectId(newOwnerUserId)) {
      return NextResponse.json(
        { error: "'newOwnerUserId' must be a valid ID" },
        { status: 400 },
      );
    }

    try {
      await OwnershipService.transferOwnership(ctx.userId, newOwnerUserId);
    } catch (error) {
      return serviceErrorToResponse(error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
