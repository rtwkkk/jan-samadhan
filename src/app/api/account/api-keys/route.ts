// ============================================================
// /api/account/api-keys
//
//   GET  — list this account's API keys (safe columns only).
//   POST — mint a new key.
//
// These are the *dashboard* endpoints for managing keys, so they
// authenticate the normal way (cookie session). Listing is open to 
// any member (viewer+) — the roster is not secret; the secret (the key itself) 
// is never in it. Minting is admin+ (a key hands out capabilities), enforced by 
// `requireRole('admin')`.
//
// IMPORTANT: the plaintext key is returned exactly ONCE, in the POST
// response. We persist only its SHA-256 hash, so neither GET nor any
// future endpoint can resurface it — same one-time-reveal contract
// as invite links. If the admin loses it, they revoke and re-issue.
// ============================================================

import { NextResponse } from 'next/server';

import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { generateApiKey } from '@/lib/api-keys/keys';
import { normalizeScopes } from '@/lib/api-keys/scopes';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { ApiKeyRepository } from '@/lib/mongodb/repositories/ApiKeyRepository';
import { randomUUID } from 'node:crypto';

const MAX_NAME_LEN = 80;
const MAX_EXPIRY_DAYS = 365;

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const keys = await ApiKeyRepository.listByAccountId(ctx.accountId);

    // Map Mongoose documents to the expected API shape
    const data = keys.map(k => ({
      id: k._id,
      name: k.name,
      key_prefix: k.keyPrefix,
      scopes: k.scopes,
      last_used_at: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      expires_at: k.expiresAt ? k.expiresAt.toISOString() : null,
      revoked_at: k.revokedAt ? k.revokedAt.toISOString() : null,
      created_at: k.createdAt.toISOString()
    }));

    return NextResponse.json({ keys: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');

    const limit = checkRateLimit(
      `admin:apiKeyCreate:${ctx.userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      scopes?: unknown;
      expiresInDays?: unknown;
    } | null;

    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!rawName) {
      return NextResponse.json(
        { error: "'name' is required" },
        { status: 400 }
      );
    }
    if (rawName.length > MAX_NAME_LEN) {
      return NextResponse.json(
        { error: `Name must be ${MAX_NAME_LEN} characters or fewer` },
        { status: 400 }
      );
    }

    const scopes = normalizeScopes(body?.scopes ?? []);
    if (scopes === null) {
      return NextResponse.json(
        { error: "'scopes' must be an array of known scope strings" },
        { status: 400 }
      );
    }

    let expiresAt: Date | undefined = undefined;
    const rawExpiry = body?.expiresInDays;
    if (
      typeof rawExpiry === 'number' &&
      Number.isFinite(rawExpiry) &&
      rawExpiry > 0
    ) {
      const days = Math.min(Math.floor(rawExpiry), MAX_EXPIRY_DAYS);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const { plaintext, hash, prefix } = generateApiKey();

    const created = await ApiKeyRepository.create({
      _id: randomUUID(),
      accountId: ctx.accountId,
      createdBy: ctx.userId,
      name: rawName,
      keyPrefix: prefix,
      keyHash: hash,
      scopes,
      expiresAt,
    });

    const keyData = {
      id: created._id,
      name: created.name,
      key_prefix: created.keyPrefix,
      scopes: created.scopes,
      last_used_at: null,
      expires_at: created.expiresAt ? created.expiresAt.toISOString() : null,
      revoked_at: null,
      created_at: created.createdAt.toISOString()
    };

    return NextResponse.json(
      {
        key: keyData,
        // Plaintext — shown to the admin exactly once.
        plaintext,
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
