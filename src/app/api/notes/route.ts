import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { ContactNoteRepository } from '@/lib/mongodb/repositories/ContactNoteRepository';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const notes = await ContactNoteRepository.findByContactId(ctx.accountId, contactId);

    return NextResponse.json(notes.map(n => ({
      id: n._id,
      contact_id: n.contactId,
      user_id: n.userId || '',
      note_text: n.noteText,
      created_at: n.createdAt.toISOString()
    })));
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const body = await request.json();
    if (!body.contact_id || !body.note_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const note = await ContactNoteRepository.create(ctx.accountId, {
      contactId: body.contact_id,
      userId: ctx.userId || null,
      noteText: body.note_text
    });

    return NextResponse.json({
      id: note._id,
      contact_id: note.contactId,
      user_id: note.userId || '',
      note_text: note.noteText,
      created_at: note.createdAt.toISOString()
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
