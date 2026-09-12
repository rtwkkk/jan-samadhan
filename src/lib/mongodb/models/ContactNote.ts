import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactNote extends Document<string> {
  _id: string;
  accountId: string;
  contactId: string;
  userId: string | null;
  noteText: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactNoteSchema = new Schema<IContactNote>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  contactId: { type: String, required: true, ref: 'Contact' },
  userId: { type: String, default: null, ref: 'User' },
  noteText: { type: String, required: true }
}, { timestamps: true });

ContactNoteSchema.index({ accountId: 1, contactId: 1 });

export const ContactNote: Model<IContactNote> = mongoose.models.ContactNote || mongoose.model<IContactNote>('ContactNote', ContactNoteSchema);
