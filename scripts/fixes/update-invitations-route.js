const fs = require('fs');

const code = `// ============================================================
// /api/account/invitations
//
//   GET  — list pending invitations (admin only).
//   POST — create a new invitation (admin only).
//
// ============================================================

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import {
  clampExpiryDays,
  generateInviteToken,
  inviteExpiresAt,
  inviteUrl,
} from "@/lib/auth/invitations";
import { isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { InvitationRepository } from "@/lib/mongodb/repositories/InvitationRepository";

function parseAllowedHosts(): readonly string[] | null {
  const raw = process.env.ALLOWED_INVITE_HOSTS?.trim();
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

function isHostAllowed(
  hostname: string,
  allowList: readonly string[] | null,
): boolean {
  if (!allowList) return true;
  return allowList.includes(hostname.toLowerCase());
}

function getBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\\/+$/, "");

  const allowList = parseAllowedHosts();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost && isHostAllowed(forwardedHost, allowList)) {
    return \`\${forwardedProto || "https"}://\${forwardedHost}\`;
  }

  const host = request.headers.get("host")?.trim();
  if (host && isHostAllowed(host, allowList)) {
    const reqProto = new URL(request.url).protocol.replace(":", "");
    return \`\${reqProto}://\${host}\`;
  }

  if (allowList && (forwardedHost || host)) {
    console.warn(
      "[POST /api/account/invitations] rejected non-allow-listed host:",
      { forwardedHost, host, allowList },
    );
  } else {
    console.warn(
      "[POST /api/account/invitations] could not derive base URL from request; falling back to marketing domain",
    );
  }
  return "https://wacrm.tech";
}

const MAX_LABEL_LEN = 80;

export async function GET() {
  try {
    const ctx = await requireRole("admin");

    const allInvites = await InvitationRepository.listByAccountId(ctx.accountId);
    
    // Filter to pending only: not accepted, not expired
    const now = new Date();
    const pending = allInvites.filter(i => !i.acceptedAt && i.expiresAt > now);

    const data = pending.map(i => ({
      id: i._id,
      role: i.role,
      label: i.label || null,
      created_by_user_id: i.createdByUserId || null,
      created_at: i.createdAt.toISOString(),
      expires_at: i.expiresAt.toISOString(),
      accepted_at: null,
      accepted_by_user_id: null
    }));

    return NextResponse.json({ invitations: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      \`admin:inviteCreate:\${ctx.userId}\`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as
      | { role?: unknown; expiresInDays?: unknown; label?: unknown }
      | null;

    const role = body?.role;
    if (!isAccountRole(role) || role === "owner") {
      return NextResponse.json(
        { error: "'role' must be one of admin, agent, viewer" },
        { status: 400 },
      );
    }

    const expiresInDaysRaw = body?.expiresInDays;
    const expiresInDays =
      typeof expiresInDaysRaw === "number" ? expiresInDaysRaw : undefined;
    const expiryDays = clampExpiryDays(expiresInDays);
    const expiresAt = inviteExpiresAt(expiryDays);

    let label: string | null = null;
    if (typeof body?.label === "string") {
      const trimmed = body.label.trim();
      if (trimmed.length > MAX_LABEL_LEN) {
        return NextResponse.json(
          { error: \`Label must be \${MAX_LABEL_LEN} characters or fewer\` },
          { status: 400 },
        );
      }
      label = trimmed === "" ? null : trimmed;
    }

    const { token, hash } = generateInviteToken();

    const created = await InvitationRepository.create({
      _id: uuidv4(),
      accountId: ctx.accountId,
      tokenHash: hash,
      role,
      createdByUserId: ctx.userId,
      label: label || undefined,
      expiresAt,
    });

    const data = {
      id: created._id,
      role: created.role,
      label: created.label || null,
      expires_at: created.expiresAt.toISOString(),
      created_at: created.createdAt.toISOString()
    };

    return NextResponse.json(
      {
        invitation: data,
        token,
        url: inviteUrl(token, getBaseUrl(request)),
        expiresInDays: expiryDays,
      },
      { status: 201 },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
`;

fs.writeFileSync('src/app/api/account/invitations/route.ts', code);
