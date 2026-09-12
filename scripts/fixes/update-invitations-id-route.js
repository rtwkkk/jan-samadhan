const fs = require('fs');

const code = `// ============================================================
// DELETE /api/account/invitations/[id]
//
// Admin+. Revokes a pending invitation by id.
// We intentionally delete the row outright rather than soft-
// deleting (a "revoked_at" flag). Once revoked, an invite is
// dead forever — there's no UX where a former invite should be
// listed; the plaintext token is gone too. Hard delete keeps
// the table small.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { InvitationRepository } from "@/lib/mongodb/repositories/InvitationRepository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      \`admin:inviteRevoke:\${ctx.userId}\`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { id } = await params;

    const success = await InvitationRepository.deleteById(ctx.accountId, id);

    if (!success) {
      // Either the id doesn't exist or it belongs to a different account.
      // 404 either way — surfacing "exists but not yours" would leak existence.
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
`;

fs.writeFileSync('src/app/api/account/invitations/[id]/route.ts', code);
