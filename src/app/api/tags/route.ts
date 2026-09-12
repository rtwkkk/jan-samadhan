import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { TagRepository } from '@/lib/mongodb/repositories/TagRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

function toSnake(doc: Record<string, unknown>) {
  return {
    id: doc._id,
    account_id: doc.accountId,
    user_id: doc.userId ?? null,
    name: doc.name,
    color: doc.color,
    created_at: doc.createdAt ? new Date(doc.createdAt as string).toISOString() : null,
  };
}

export async function GET() {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();

    const tags = await TagRepository.findMany(ctx.accountId);
    return NextResponse.json(tags.map((t) => toSnake(t as unknown as Record<string, unknown>)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    try {
      const tag = await TagRepository.create({
        _id: crypto.randomUUID(),
        accountId: ctx.accountId,
        userId: ctx.userId,
        name,
        color: typeof body.color === 'string' ? body.color : '#3b82f6',
      });

      return NextResponse.json(toSnake(tag as unknown as Record<string, unknown>), { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
