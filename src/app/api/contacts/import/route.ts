import { NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth/api-context';
import { connectToDatabase } from '@/lib/mongodb/client';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { findExistingContact, isUniqueViolation, normalizeKey } from '@/lib/contacts/dedupe';
import { resolveImportTagIds } from '@/lib/contacts/resolve-import-tags';
import { addContactTagAndDispatch } from '@/lib/contacts/tag-events';


export async function POST(request: Request) {
  try {
    const ctx = await requireApiKey(request, 'contacts:write');
    await connectToDatabase();

    const body = await request.json();
    const rows = body.rows as Array<{ phone: string; name?: string; email?: string; company?: string; tagNames: string[] }>;
    const canCreateTags = body.canCreateTags === true;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Resolve tag names -> IDs in bulk
    const allTagNames = rows.flatMap((r) => r.tagNames || []);
    let tagIdByKey = new Map<string, string>();
    if (allTagNames.length > 0) {
      const resolved = await resolveImportTagIds({
        accountId: ctx.accountId,
        userId: 'system', // or ctx.userId if available in context
        tagNames: allTagNames,
        canCreateTags,
      });
      tagIdByKey = resolved.tagIdByKey;
    }

    // Process sequentially (or in small batches) to avoid overwhelming connection pool
    for (const row of rows) {
      try {
        const existing = await findExistingContact(ctx.accountId, row.phone);
        if (existing) {
          skipped++;
          continue;
        }

        const contactId = crypto.randomUUID();
        await ContactRepository.create({
          _id: contactId,
          accountId: ctx.accountId,
          userId: 'system',
          phone: row.phone,
          name: row.name || row.phone,
          email: row.email || undefined,
          company: row.company || undefined,
        });
        imported++;

        // Add tags
        if (row.tagNames && row.tagNames.length > 0) {
          const addedIds = new Set<string>();
          for (const tName of row.tagNames) {
            const tagId = tagIdByKey.get(tName.trim().toLowerCase());
            if (tagId && !addedIds.has(tagId)) {
              addedIds.add(tagId);
              try {
                await addContactTagAndDispatch({
                  accountId: ctx.accountId,
                  contactId,
                  tagId,
                });
              } catch (e) {
                console.error(`[import] Failed to add tag ${tagId} to ${contactId}`, e);
              }
            }
          }
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          skipped++;
        } else {
          console.error('[import] Failed to import row', row, err);
          failed++;
        }
      }
    }

    return NextResponse.json({ imported, skipped, failed });
  } catch (err: any) {
    console.error('[api/contacts/import]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
