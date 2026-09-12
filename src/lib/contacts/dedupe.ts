import { normalizePhone, phonesMatch } from "@/lib/whatsapp/phone-utils";
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

/**
 * Contact de-duplication helpers, shared by the WhatsApp webhook, the
 * manual contact form, and CSV import so all paths agree on what
 * "same number" means (issue #212).
 */

/** Canonical de-dup key for a phone string (digits only). */
export function normalizeKey(phone: string): string {
  return normalizePhone(phone);
}

/** Minimal shape we need back from a contacts lookup. */
export interface ExistingContact {
  id: string;
  phone: string;
  name?: string | null;
  [key: string]: unknown;
}

/**
 * Find an existing contact in `accountId` whose phone matches `phone`,
 * or null. Queries MongoDB by phone suffix then applies strict
 * `phonesMatch` in JS on the small candidate set.
 */
export async function findExistingContact(
  accountId: string,
  phone: string,
): Promise<ExistingContact | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  await connectToDatabase();

  const suffix = normalized.length >= 8 ? normalized.slice(-8) : normalized;
  const candidates = await ContactRepository.findByPhoneSuffix(accountId, suffix);

  const match = candidates.find((c) => phonesMatch(c.phone, phone));
  if (!match) return null;

  return {
    id: match._id,
    phone: match.phone,
    name: match.name,
  };
}

/**
 * True when an existing contact is an *exact* normalized match for
 * `phone` (vs only a fuzzy trunk-variant match).
 */
export function isExactMatch(existing: ExistingContact, phone: string): boolean {
  return normalizeKey(existing.phone) === normalizeKey(phone);
}

/**
 * True for a MongoDB duplicate key error (code 11000).
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: number }).code === 11000;
}

/**
 * De-duplicate parsed CSV rows by normalized phone.
 */
export function dedupeByPhone<T extends { phone: string }>(
  rows: T[],
): { unique: T[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicates = 0;

  for (const row of rows) {
    const key = normalizeKey(row.phone);
    if (!key) {
      duplicates++;
      continue;
    }
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }

  return { unique, duplicates };
}
