import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { addContactTagAndDispatch } from '@/lib/contacts/tag-events';
import {
  ContactTagWriteError,
  removeContactTag,
} from '@/lib/contacts/tag-write';

function tagWriteErrorResponse(error: ContactTagWriteError): NextResponse {
  return NextResponse.json({ error: error.message }, { status: error.status });
}

async function readTagId(request: Request): Promise<string | null> {
  const body = (await request.json().catch(() => null)) as {
    tag_id?: unknown;
  } | null;
  return typeof body?.tag_id === 'string' && body.tag_id.trim()
    ? body.tag_id.trim()
    : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id: contactId } = await params;
    const tagId = await readTagId(request);
    if (!tagId) {
      return NextResponse.json({ error: 'tag_id required' }, { status: 400 });
    }

    const result = await addContactTagAndDispatch({
      accountId: ctx.accountId,
      contactId,
      tagId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContactTagWriteError) {
      return tagWriteErrorResponse(error);
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id: contactId } = await params;
    const tagId = await readTagId(request);
    if (!tagId) {
      return NextResponse.json({ error: 'tag_id required' }, { status: 400 });
    }

    await removeContactTag({
      accountId: ctx.accountId,
      contactId,
      tagId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContactTagWriteError) {
      return tagWriteErrorResponse(error);
    }
    return toErrorResponse(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { id: contactId } = await params;

    const { ContactRepository } = await import('@/lib/mongodb/repositories/ContactRepository');
    const { TagRepository } = await import('@/lib/mongodb/repositories/TagRepository');
    
    const contact = await ContactRepository.findById(ctx.accountId, contactId);
    if (!contact) {
      return NextResponse.json({ data: [] });
    }

    const tags = await TagRepository.findMany(ctx.accountId);
    
    const mapped = (contact.tagIds || []).map(tagId => {
      const tag = tags.find(t => t._id === tagId);
      if (!tag) return null;
      return {
        id: `ct_${contactId}_${tagId}`,
        tag_id: tagId,
        tags: {
          id: tag._id,
          account_id: tag.accountId,
          name: tag.name,
          color: tag.color,
          created_at: tag.createdAt ? new Date(tag.createdAt as any).toISOString() : null
        }
      };
    }).filter(Boolean);

    return NextResponse.json({ data: mapped });
  } catch (error) {
    return toErrorResponse(error);
  }
}
