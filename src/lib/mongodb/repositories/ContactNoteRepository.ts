import { randomUUID } from 'node:crypto';
import { ContactNote, IContactNote } from '../models/ContactNote';

export class ContactNoteRepository {
  static async findByContactId(accountId: string, contactId: string): Promise<IContactNote[]> {
    return ContactNote.find({ accountId, contactId })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async create(accountId: string, data: { contactId: string; userId: string | null; noteText: string }): Promise<IContactNote> {
    const note = new ContactNote({
      _id: randomUUID(),
      accountId,
      contactId: data.contactId,
      userId: data.userId,
      noteText: data.noteText
    });
    await note.save();
    return note.toObject();
  }

  static async delete(accountId: string, noteId: string): Promise<boolean> {
    const result = await ContactNote.deleteOne({ _id: noteId, accountId });
    return result.deletedCount === 1;
  }
}
