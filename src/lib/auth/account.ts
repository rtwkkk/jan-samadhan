// ============================================================
// Server-side account context — for API routes and server
// components. Reads the caller's profile + account from MongoDB
// session cookie (wacrm_session).
//
// IMPORTANT: this module is server-only. It reads `next/headers`
// cookies. Importing it from a client component will fail at
// build time with the standard Next.js "You're importing a
// component that needs `next/headers`" error.
//
// Calling convention
// ------------------
// API routes receive a fully-loaded context from `requireRole`:
//
//   try {
//     const ctx = await requireRole("admin");
//     // ctx.userId   — authenticated user ID
//     // ctx.accountId / ctx.role / ctx.account
//   } catch (err) {
//     return toErrorResponse(err);
//   }
// ============================================================

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/server";
import { hasMinRole, isAccountRole, type AccountRole } from "./roles";

// ------------------------------------------------------------
// Errors
// ------------------------------------------------------------

export class UnauthorizedError extends Error {
  readonly status = 401 as const;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403 as const;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[toErrorResponse] uncategorized error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// ------------------------------------------------------------
// Account context
// ------------------------------------------------------------

export interface AccountContext {
  /** Authenticated user ID from the MongoDB session. */
  userId: string;
  /** Caller's account_id. */
  accountId: string;
  /** Caller's role within their account. */
  role: AccountRole;
  /** Lightweight account meta — id + name. */
  account: { id: string; name: string };
}

/**
 * Resolve the caller's user + account + role from the MongoDB session cookie.
 *
 * Throws `UnauthorizedError` if there's no valid session.
 * Throws `ForbiddenError` if the session is valid but the user
 * has no account linkage.
 */
export async function getCurrentAccount(): Promise<AccountContext> {
  let ctx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    ctx = await requireAuth();
  } catch {
    throw new UnauthorizedError();
  }

  const role = ctx.role as string;
  if (!isAccountRole(role)) {
    throw new ForbiddenError(`Unknown account role: ${role}`);
  }

  return {
    userId: ctx.userId,
    accountId: ctx.accountId,
    role,
    account: { id: ctx.account.id, name: ctx.account.name },
  };
}

/**
 * Resolve the caller's account context and enforce a minimum role.
 */
export async function requireRole(min: AccountRole): Promise<AccountContext> {
  const ctx = await getCurrentAccount();
  if (!hasMinRole(ctx.role, min)) {
    throw new ForbiddenError(
      `This action requires the '${min}' role or higher`,
    );
  }
  return ctx;
}
