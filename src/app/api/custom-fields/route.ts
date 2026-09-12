import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { CustomFieldRepository } from '@/lib/mongodb/repositories/CustomFieldRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

function toSnake(doc: Record<string, unknown>) {
  return {
    id: doc._id,
    account_id: doc.accountId,
    user_id: doc.userId ?? null,
    field_name: doc.fieldName,
    field_type: doc.fieldType,
    field_options: doc.fieldOptions ?? null,
    created_at: doc.createdAt ? new Date(doc.createdAt as string).toISOString() : null,
  };
}

export async function GET() {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();

    const fields = await CustomFieldRepository.findMany(ctx.accountId);
    return NextResponse.json(fields.map((f) => toSnake(f as unknown as Record<string, unknown>)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const fieldName = typeof body.field_name === 'string' ? body.field_name.trim() : '';
    if (!fieldName) {
      return NextResponse.json({ error: 'field_name is required' }, { status: 400 });
    }

    try {
      const field = await CustomFieldRepository.create({
        _id: crypto.randomUUID(),
        accountId: ctx.accountId,
        userId: ctx.userId,
        fieldName,
        fieldType: typeof body.field_type === 'string' ? body.field_type : 'text',
        fieldOptions: typeof body.field_options === 'object' ? body.field_options : undefined,
      });

      return NextResponse.json(toSnake(field as unknown as Record<string, unknown>), { status: 201 });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        return NextResponse.json({ error: 'A custom field with this name already exists' }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
