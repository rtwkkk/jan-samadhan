import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { ContactNoteRepository } from '@/lib/mongodb/repositories/ContactNoteRepository';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const success = await ContactNoteRepository.delete(ctx.accountId, (await params).id);
    if (!success) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
