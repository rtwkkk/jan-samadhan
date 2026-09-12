// ============================================================
// GET  /api/v1/contacts  — list contacts (scope: contacts:read)
// POST /api/v1/contacts  — create a contact  (scope: contacts:write)
//
// List is keyset-paginated (see src/lib/api/v1/pagination.ts) and
// supports `?search=` (name/phone) and `?tag=<tagId>` filters. Create
// is find-or-create by phone: an existing match returns 200 with
// `created: false`; a new row returns 201 with `created: true`.
// ============================================================

import { requireApiAuth } from '@/lib/auth/api-context';
import { ok, okList, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import {
  parseListParams,
  buildPage,
} from '@/lib/api/v1/pagination';
import {
  serializeContactFromMongo,
  findOrCreateContact,
  setContactTags,
  getContactById,
  resolveAuditUserId,
  ContactError,
} from '@/lib/api/v1/contacts';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

import { IContact } from '@/lib/mongodb/models/Contact';

function sanitizeSearch(raw: string): string {
  return raw.replace(/[^\p{L}\p{N} +@.\-_]/gu, '').trim();
}

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:read', 'viewer');
    await connectToDatabase();
    
    const { limit, cursor } = parseListParams(request);
    const url = new URL(request.url);
    const search = sanitizeSearch(url.searchParams.get('search') ?? '');
    const tag = url.searchParams.get('tag');

    const filter: Record<string, any> = { accountId: ctx.accountId };

    if (search) {
      const like = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: like },
        { phone: like },
      ];
    }

    if (tag) {
      filter.tagIds = tag;
    }

    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        { 
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id }
        }
      ];
    }

    // Overfetch by 1 to determine if there's a next page
    const data = await ContactRepository.findMany(
      ctx.accountId,
      filter,
      limit + 1
    );

    // Map to the shape buildPage expects for cursor encoding
    const mappedForPagination = data.map(doc => ({
      ...doc,
      created_at: doc.createdAt.toISOString(),
      id: doc._id
    }));

    const { items, nextCursor } = buildPage(
      mappedForPagination as any,
      limit
    );

    const serializedItems = await Promise.all(
      items.map(r => serializeContactFromMongo(r as any, ctx.accountId))
    );

    return okList(serializedItems, nextCursor);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:write', 'agent');

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Request body must be a JSON object', 400);
    }

    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phone) {
      return fail('bad_request', "'phone' is required", 400);
    }

    const auditUserId = await resolveAuditUserId(ctx.accountId);

    const { id, created } = await findOrCreateContact(
      ctx.accountId,
      auditUserId,
      {
        phone,
        name: typeof body.name === 'string' ? body.name : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        company: typeof body.company === 'string' ? body.company : undefined,
      }
    );

    if (Array.isArray(body.tags)) {
      await setContactTags(
        ctx.accountId,
        auditUserId,
        id,
        body.tags.filter((t): t is string => typeof t === 'string')
      );
    }

    const contact = await getContactById(ctx.accountId, id);
    return ok(contact, created ? 201 : 200);
  } catch (err) {
    if (err instanceof ContactError) {
      return fail(
        err.status === 400 ? 'bad_request' : 'internal',
        err.message,
        err.status
      );
    }
    return toApiErrorResponse(err);
  }
}
