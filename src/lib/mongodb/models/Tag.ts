import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITag extends Document<string> {
  _id: string;
  accountId: string;
  userId?: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String },
  name: { type: String, required: true },
  color: { type: String, required: true, default: '#3b82f6' }
}, { timestamps: true, _id: false });

// Names should be unique per account
TagSchema.index({ accountId: 1, name: 1 }, { unique: true });

export const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);
