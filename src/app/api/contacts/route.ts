import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

/** Serialize a MongoDB contact doc to the snake_case shape the UI expects. */
function toSnake(doc: Record<string, unknown>) {
  return {
    id: doc._id,
    account_id: doc.accountId,
    user_id: doc.userId ?? null,
    phone: doc.phone,
    name: doc.name ?? null,
    email: doc.email ?? null,
    company: doc.company ?? null,
    avatar_url: doc.avatarUrl ?? null,
    tag_ids: doc.tagIds ?? [],
    custom_fields: doc.customFields ?? {},
    created_at: doc.createdAt ? new Date(doc.createdAt as string).toISOString() : null,
    updated_at: doc.updatedAt ? new Date(doc.updatedAt as string).toISOString() : null,
  };
}

/**
 * GET /api/contacts — list contacts with optional search + tag filter + pagination.
 * Query params: search, tag_ids (comma-separated), page, page_size
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim() || undefined;
    const tagIdsParam = url.searchParams.get('tag_ids');
    const tagIds = tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : undefined;
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') ?? '25', 10) || 25));

    const { contacts, total } = await ContactRepository.search(ctx.accountId, {
      search,
      tagIds,
      limit: pageSize,
      skip: page * pageSize,
    });

    return NextResponse.json({
      contacts: contacts.map((c) => toSnake(c as unknown as Record<string, unknown>)),
      total,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/contacts — create a contact.
 * Body: { phone, name?, email?, company?, tag_ids? }
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    try {
      const contact = await ContactRepository.create({
        _id: crypto.randomUUID(),
        accountId: ctx.accountId,
        userId: ctx.userId,
        phone,
        name: typeof body.name === 'string' ? body.name.trim() || undefined : undefined,
        email: typeof body.email === 'string' ? body.email.trim() || undefined : undefined,
        company: typeof body.company === 'string' ? body.company.trim() || undefined : undefined,
        tagIds: Array.isArray(body.tag_ids) ? body.tag_ids.filter((t: unknown) => typeof t === 'string') : [],
      });

      return NextResponse.json(toSnake(contact as unknown as Record<string, unknown>), { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        return NextResponse.json({ error: 'A contact with this phone number already exists' }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/contacts — bulk delete contacts.
 * Body: { ids: string[] }
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const body = await request.json().catch(() => null);
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const deleted = await ContactRepository.bulkDelete(ctx.accountId, ids);
    return NextResponse.json({ deleted });
  } catch (error) {
    return toErrorResponse(error);
  }
}
