import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { TagRepository } from '@/lib/mongodb/repositories/TagRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

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
    if ('name' in body && typeof body.name === 'string') update.name = body.name.trim();
    if ('color' in body && typeof body.color === 'string') update.color = body.color;

    const tag = await TagRepository.updateById(ctx.accountId, id, update);
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: tag._id,
      name: tag.name,
      color: tag.color,
    });
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

    const deleted = await TagRepository.deleteById(ctx.accountId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
