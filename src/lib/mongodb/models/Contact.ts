import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document<string> {
  _id: string;
  accountId: string;
  userId?: string;
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  avatarUrl?: string;
  tagIds: string[];
  customFields: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String },
  phone: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  company: { type: String },
  avatarUrl: { type: String },
  tagIds: [{ type: String, ref: 'Tag' }],
  customFields: { type: Map, of: String, default: {} }
}, { timestamps: true, _id: false });

ContactSchema.index({ accountId: 1, phone: 1 }, { unique: true });
ContactSchema.index({ accountId: 1, createdAt: -1 });

export const Contact: Model<IContact> = mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
