const fs = require('fs');

const code = `// ============================================================
// API key store — the *auth-path* data access for public API keys.
//
// Only the read side lives here, and deliberately so: it runs with
// bypassing RLS because a public-API caller has no cookie session.
// The hash is the only credential, so this is the moment that
// establishes the caller's account.
// ============================================================

import { ApiKeyRepository } from '@/lib/mongodb/repositories/ApiKeyRepository';
import { Account } from '@/lib/mongodb/models/Account';

/** Shape of an \`api_keys\` row as the auth path consumes it. */
export interface ApiKeyRow {
  id: string;
  account_id: string;
  created_by: string | null;
  name: string;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
}

/**
 * Look up an *active* key by its SHA-256 hash. Returns null if no
 * row matches, or if the matching row is revoked or expired — so
 * callers never have to re-check liveness.
 */
export async function findActiveKeyByHash(
  hash: string
): Promise<ApiKeyRow | null> {
  let doc;
  try {
    doc = await ApiKeyRepository.findByHash(hash);
  } catch (err) {
    console.error('[api-keys/store] lookup error:', err);
    return null;
  }
  
  if (!doc) return null;

  // Liveness checks in JS so the failure modes are
  // explicit and the index stays a simple equality lookup.
  if (doc.revokedAt) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return {
    id: doc._id,
    account_id: doc.accountId,
    created_by: doc.createdBy || null,
    name: doc.name,
    scopes: doc.scopes,
    expires_at: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    revoked_at: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
  };
}

/**
 * Fetch the account name for a resolved key, so \`/api/v1/me\` and any
 * future endpoint can echo it without a second round trip in the
 * route. The key already proved account membership.
 */
export async function getAccountName(
  accountId: string
): Promise<string | null> {
  try {
    const data = await Account.findOne({ _id: accountId }).lean();
    if (!data) return null;
    return data.name || null;
  } catch (err) {
    return null;
  }
}

/**
 * Best-effort \`last_used_at\` bump. Fire-and-forget from the auth
 * path — a failed update just means the "last used" column lags;
 * it must never fail the request the caller is actually making.
 */
export function touchLastUsed(id: string): void {
  ApiKeyRepository.touchLastUsed(id).catch(err => {
    console.warn('[api-keys/store] last_used_at bump failed:', err);
  });
}
`;

fs.writeFileSync('src/lib/api-keys/store.ts', code);
