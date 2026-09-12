import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { CustomFieldRepository } from '@/lib/mongodb/repositories/CustomFieldRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if ('field_name' in body && typeof body.field_name === 'string') {
      update.fieldName = body.field_name.trim();
    }

    const field = await CustomFieldRepository.updateById(ctx.accountId, id, update);
    if (!field) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: field._id,
      field_name: field.fieldName,
      field_type: field.fieldType,
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
    const ctx = await requireRole('admin');
    await connectToDatabase();
    const { id } = await params;

    const deleted = await CustomFieldRepository.deleteById(ctx.accountId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
