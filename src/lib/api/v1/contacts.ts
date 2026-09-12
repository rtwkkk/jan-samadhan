// ============================================================
// Shared contact logic for the public API (v1) contact endpoints.
// Migrated to MongoDB.
// ============================================================


import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe';
import { resolveImportTagIds } from '@/lib/contacts/resolve-import-tags';
import { addContactTagAndDispatch } from '@/lib/contacts/tag-events';
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { TagRepository } from '@/lib/mongodb/repositories/TagRepository';
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

export interface ApiContact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
  tags: { id: string; name: string; color: string }[];
  created_at: string;
  updated_at: string;
}

/** Thrown by the helpers below; routes map `.status`/`.message`. */
export class ContactError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ContactError';
    this.status = status;
  }
}

/** Kept for compatibility with the v1 route file. */
export const CONTACT_SELECT = '*';

/** Serialize a MongoDB contact doc + resolved tags into the public API shape. */
export async function serializeContactFromMongo(
  doc: Record<string, unknown>,
  accountId: string
): Promise<ApiContact> {
  const tagIds = (doc.tagIds as string[] | undefined) ?? [];
  let tags: { id: string; name: string; color: string }[] = [];

  if (tagIds.length > 0) {
    const allTags = await TagRepository.findMany(accountId);
    const tagMap = new Map(allTags.map((t) => [t._id, t]));
    tags = tagIds
      .map((id) => tagMap.get(id))
      .filter((t): t is NonNullable<typeof t> => t != null)
      .map((t) => ({ id: t._id, name: t.name, color: t.color }));
  }

  return {
    id: doc._id as string,
    phone: doc.phone as string,
    name: (doc.name as string | null) ?? null,
    email: (doc.email as string | null) ?? null,
    company: (doc.company as string | null) ?? null,
    avatar_url: (doc.avatarUrl as string | null) ?? null,
    tags,
    created_at: doc.createdAt ? new Date(doc.createdAt as string).toISOString() : '',
    updated_at: doc.updatedAt ? new Date(doc.updatedAt as string).toISOString() : '',
  };
}

/** Legacy alias used by the v1 route */
export function serializeContact(row: Record<string, unknown>): ApiContact {
  // For v1 routes that already have tags resolved, use a sync path
  const tags = (row.tags as { id: string; name: string; color: string }[] | undefined) ?? [];
  return {
    id: (row._id ?? row.id) as string,
    phone: row.phone as string,
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    avatar_url: (row.avatarUrl ?? row.avatar_url ?? null) as string | null,
    tags,
    created_at: row.createdAt ? new Date(row.createdAt as string).toISOString() : (row.created_at as string) ?? '',
    updated_at: row.updatedAt ? new Date(row.updatedAt as string).toISOString() : (row.updated_at as string) ?? '',
  };
}

/**
 * Resolve the audit `user_id` for API-created rows — uses WhatsApp
 * config owner or account owner.
 */
export async function resolveAuditUserId(
  accountId: string
): Promise<string> {
  await connectToDatabase();

  const config = await WhatsappConfigRepository.findByAccountId(accountId);
  return 'system';

  // Fall back to a default user ID - in MongoDB auth, this would be the
  // account owner. For now, return a placeholder since accounts aren't
  // migrated yet.
  return 'system';
}

export interface ContactInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
}

/**
 * Find (by fuzzy phone match) or create a contact in `accountId`.
 */
export async function findOrCreateContact(
  accountId: string,
  auditUserId: string,
  input: ContactInput
): Promise<{ id: string; created: boolean }> {
  await connectToDatabase();

  const sanitized = sanitizePhoneForMeta(input.phone);
  if (!isValidE164(sanitized)) {
    throw new ContactError(
      "'phone' must be a valid phone number in E.164 format (e.g. +14155550123)",
      400
    );
  }

  const existing = await findExistingContact(accountId, sanitized);
  if (existing) return { id: existing.id, created: false };

  try {
    const created = await ContactRepository.create({
      _id: crypto.randomUUID(),
      accountId,
      userId: auditUserId,
      phone: sanitized,
      name: input.name ?? sanitized,
      email: input.email ?? undefined,
      company: input.company ?? undefined,
    });

    return { id: created._id, created: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      const raced = await findExistingContact(accountId, sanitized);
      if (raced) return { id: raced.id, created: false };
    }
    console.error('[api/v1/contacts] create error:', err);
    throw new ContactError('Failed to create contact', 500);
  }
}

/**
 * Replace a contact's tags to exactly match `tagNames`.
 */
export async function setContactTags(
  accountId: string,
  auditUserId: string,
  contactId: string,
  tagNames: string[]
): Promise<void> {
  const { tagIdByKey } = await resolveImportTagIds({
    accountId,
    userId: auditUserId,
    tagNames,
    canCreateTags: true,
  });
  const desired = new Set(tagIdByKey.values());

  const contact = await ContactRepository.findById(accountId, contactId);
  if (!contact) throw new ContactError('Contact not found', 404);

  const existing = new Set(contact.tagIds);

  const toAdd = [...desired].filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !desired.has(id));

  for (const tagId of toRemove) {
    await ContactRepository.removeTag(accountId, contactId, tagId);
  }
  for (const tagId of toAdd) {
    try {
      await addContactTagAndDispatch({
        accountId,
        contactId,
        tagId,
      });
    } catch (error) {
      console.error('[api/v1/contacts] tag add failed:', error);
      throw new ContactError('Failed to update contact tags', 500);
    }
  }
}

/** Fetch + serialize a single contact scoped to the account, or null. */
export async function getContactById(
  accountId: string,
  contactId: string
): Promise<ApiContact | null> {
  await connectToDatabase();
  const contact = await ContactRepository.findById(accountId, contactId);
  if (!contact) return null;
  return serializeContactFromMongo(contact as unknown as Record<string, unknown>, accountId);
}
