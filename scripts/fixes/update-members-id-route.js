const fs = require('fs');

const code = `// ============================================================
// /api/account/members/[userId]
//
//   PATCH  — change a member's role.   Admin+.
//   DELETE — remove a member.          Admin+.
//
// Both delegate to TeamService which implements the
// authorisation work — caller must be admin+, target must be in 
// caller's account, target can't be the owner, can't be self.
// ============================================================

import { NextResponse } from "next/server";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { TeamService } from "@/lib/auth/team-service";

function serviceErrorToResponse(err: any): NextResponse {
  const message = err.message || '';
  if (message.startsWith("42501:")) {
    return NextResponse.json({ error: message.split(':')[1] }, { status: 403 });
  }
  if (message.startsWith("22023:")) {
    return NextResponse.json({ error: message.split(':')[1] }, { status: 400 });
  }
  console.error("[members route] unexpected service error:", err);
  return NextResponse.json(
    { error: "Failed to update member" },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      \`admin:memberRole:\${ctx.userId}\`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const body = (await request.json().catch(() => null)) as
      | { role?: unknown }
      | null;
    const role = body?.role;

    if (!isAccountRole(role)) {
      return NextResponse.json(
        { error: "'role' must be one of owner, admin, agent, viewer" },
        { status: 400 },
      );
    }

    if (role === "owner") {
      return NextResponse.json(
        {
          error:
            "Use POST /api/account/transfer-ownership to promote a member to owner",
        },
        { status: 400 },
      );
    }

    try {
      await TeamService.setMemberRole(ctx.userId, userId, role);
    } catch (error) {
      return serviceErrorToResponse(error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      \`admin:memberRemove:\${ctx.userId}\`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    let newPersonalAccountId: string;
    try {
      newPersonalAccountId = await TeamService.removeMember(ctx.userId, userId);
    } catch (error) {
      return serviceErrorToResponse(error);
    }

    return NextResponse.json({ ok: true, newPersonalAccountId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
`;

fs.writeFileSync('src/app/api/account/members/[userId]/route.ts', code);
