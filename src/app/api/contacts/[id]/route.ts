import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();
    const { id } = await params;

    const contact = await ContactRepository.findById(ctx.accountId, id);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(toSnake(contact as unknown as Record<string, unknown>));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if ('name' in body) update.name = body.name === null ? undefined : String(body.name).trim() || undefined;
    if ('phone' in body) update.phone = String(body.phone).trim();
    if ('email' in body) update.email = body.email === null ? undefined : String(body.email).trim() || undefined;
    if ('company' in body) update.company = body.company === null ? undefined : String(body.company).trim() || undefined;
    if ('tag_ids' in body && Array.isArray(body.tag_ids)) {
      update.tagIds = body.tag_ids.filter((t: unknown) => typeof t === 'string');
    }
    if ('custom_fields' in body && typeof body.custom_fields === 'object' && body.custom_fields !== null) {
      update.customFields = body.custom_fields;
    }

    const contact = await ContactRepository.updateById(ctx.accountId, id, update);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(toSnake(contact as unknown as Record<string, unknown>));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();
    const { id } = await params;

    const deleted = await ContactRepository.deleteById(ctx.accountId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
