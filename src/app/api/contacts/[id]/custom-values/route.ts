import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { ContactRepository } from '@/lib/mongodb/repositories/ContactRepository';
import { CustomFieldRepository } from '@/lib/mongodb/repositories/CustomFieldRepository';
import { connectToDatabase } from '@/lib/mongodb/client';

/**
 * GET /api/contacts/[id]/custom-values — get custom field definitions + values for this contact.
 */
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

    const fields = await CustomFieldRepository.findMany(ctx.accountId);
    const values: Record<string, string> = {};
    if (contact.customFields) {
      for (const [k, v] of contact.customFields.entries()) {
        values[k] = v;
      }
    }

    return NextResponse.json({
      fields: fields.map((f) => ({
        id: f._id,
        field_name: f.fieldName,
        field_type: f.fieldType,
        field_options: f.fieldOptions ?? null,
        created_at: f.createdAt?.toISOString() ?? null,
      })),
      values,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PUT /api/contacts/[id]/custom-values — replace all custom field values for this contact.
 * Body: { values: Record<field_id, value_string> }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body.values !== 'object') {
      return NextResponse.json({ error: 'values object required' }, { status: 400 });
    }

    const contact = await ContactRepository.findById(ctx.accountId, id);
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Build the new customFields map — only keep non-empty values
    const newValues: Record<string, string> = {};
    for (const [fieldId, val] of Object.entries(body.values)) {
      if (typeof val === 'string' && val.trim()) {
        newValues[fieldId] = val.trim();
      }
    }

    await ContactRepository.updateById(ctx.accountId, id, { customFields: newValues as unknown as Map<string, string> });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
