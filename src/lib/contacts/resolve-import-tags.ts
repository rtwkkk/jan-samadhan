
import { TagRepository } from '@/lib/mongodb/repositories/TagRepository';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

const DEFAULT_TAG_COLOR = '#3b82f6';

export interface ResolveImportTagsResult {
  /** Lowercase tag name → tag id. */
  tagIdByKey: Map<string, string>;
  /** Names that could not be matched and were not created. */
  skippedNames: string[];
}

/**
 * Resolve tag names from a CSV import to tag ids. Existing account tags
 * are matched case-insensitively. Missing names are created when
 * `canCreateTags` is true (admin+); otherwise they are reported in
 * `skippedNames`.
 */
export async function resolveImportTagIds(
  params: {
    accountId: string;
    userId: string;
    tagNames: string[];
    canCreateTags: boolean;
    defaultColor?: string;
  }
): Promise<ResolveImportTagsResult> {
  const { accountId, userId, tagNames, canCreateTags } = params;
  const defaultColor = params.defaultColor ?? DEFAULT_TAG_COLOR;

  await connectToDatabase();

  const uniqueNames: string[] = [];
  const seen = new Set<string>();
  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueNames.push(name);
  }

  if (uniqueNames.length === 0) {
    return { tagIdByKey: new Map(), skippedNames: [] };
  }

  const existing = await TagRepository.findMany(accountId);

  const tagIdByKey = new Map<string, string>();
  for (const tag of existing) {
    const key = tag.name.trim().toLowerCase();
    if (!tagIdByKey.has(key)) tagIdByKey.set(key, tag._id);
  }

  const skippedNames: string[] = [];
  const toCreate: string[] = [];

  for (const name of uniqueNames) {
    const key = name.toLowerCase();
    if (tagIdByKey.has(key)) continue;
    if (canCreateTags) toCreate.push(name);
    else skippedNames.push(name);
  }

  if (toCreate.length > 0) {
    const created = await TagRepository.createMany(
      toCreate.map((name) => ({
        _id: crypto.randomUUID(),
        userId,
        accountId,
        name,
        color: defaultColor,
      }))
    );

    for (const tag of created) {
      tagIdByKey.set(tag.name.trim().toLowerCase(), tag._id);
    }
  }

  return { tagIdByKey, skippedNames };
}

export interface ContactTagAssignment {
  contactId: string;
  tagNames: string[];
}

/**
 * Assign tags to imported contacts using MongoDB.
 * Uses $addToSet to avoid duplicates.
 */
export async function assignImportedContactTags(
  accountId: string,
  assignments: ContactTagAssignment[],
  tagIdByKey: Map<string, string>
): Promise<number> {
  await connectToDatabase();

  let assigned = 0;

  for (const { contactId, tagNames } of assignments) {
    const tagIds: string[] = [];
    const assignedSet = new Set<string>();
    for (const name of tagNames) {
      const tagId = tagIdByKey.get(name.trim().toLowerCase());
      if (!tagId || assignedSet.has(tagId)) continue;
      assignedSet.add(tagId);
      tagIds.push(tagId);
    }

    if (tagIds.length > 0) {
      await ContactRepository.addTags(accountId, contactId, tagIds);
      assigned += tagIds.length;
    }
  }

  return assigned;
}
