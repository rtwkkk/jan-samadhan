// ============================================================
// GET /api/account/members
//
// Lists every member of the caller's account. Any member can call
// it (the Members tab is shown to admins+, but agents/viewers see
// a read-only roster too).
//
// Field visibility
//   Sensitive fields (email) are returned only when the caller is
//   admin+. Agents and viewers see name + avatar + role + joined
//   date only.
// ============================================================

import { NextResponse } from "next/server";

import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { canManageMembers, isAccountRole } from "@/lib/auth/roles";
import type { AccountMember } from "@/types";
import { User } from "@/lib/mongodb/models/User";

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const data = await User.find({ accountId: ctx.accountId })
      .sort({ createdAt: 1 })
      .lean();

    const canSeeEmails = canManageMembers(ctx.role);

    const members: AccountMember[] = data.flatMap((row) => {
      if (!row.accountRole || !isAccountRole(row.accountRole)) return [];
      return [
        {
          user_id: row._id as string,
          full_name: row.fullName ?? "",
          email: canSeeEmails ? (row.email ?? null) : null,
          avatar_url: row.avatarUrl ?? null,
          role: row.accountRole,
          joined_at: (row as any).createdAt ? new Date((row as any).createdAt).toISOString() : new Date().toISOString(),
        },
      ];
    });

    return NextResponse.json({ members });
  } catch (err) {
    return toErrorResponse(err);
  }
}
