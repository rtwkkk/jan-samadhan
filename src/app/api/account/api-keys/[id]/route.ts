// ============================================================
// DELETE /api/account/api-keys/[id] — revoke a key.
//
// Soft revoke: sets `revoked_at` rather than deleting the row, so
// the key's name/prefix stay visible in the roster as an audit
// trail ("this key existed and was turned off") and so the auth
// path's liveness check starts rejecting it immediately.
// Admin+ enforced by `requireRole('admin')`.
// ============================================================

import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { ApiKeyRepository } from '@/lib/mongodb/repositories/ApiKeyRepository';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');

    const limit = checkRateLimit(
      `admin:apiKeyRevoke:${ctx.userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { id } = await params;

    const existing = await ApiKeyRepository.findById(ctx.accountId, id);
    if (!existing || existing.revokedAt) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    const updated = await ApiKeyRepository.revokeById(ctx.accountId, id);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
