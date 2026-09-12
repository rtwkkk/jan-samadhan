import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuickReplyKind = 'text' | 'interactive';

export interface IQuickReply extends Document<string> {
  _id: string;
  accountId: string;
  userId: string;
  title: string;
  kind: QuickReplyKind;
  contentText?: string | null;
  interactivePayload?: any | null;
  createdAt: Date;
  updatedAt: Date;
}

const QuickReplySchema = new Schema<IQuickReply>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  kind: { type: String, enum: ['text', 'interactive'], required: true },
  contentText: { type: String, default: null },
  interactivePayload: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

QuickReplySchema.index({ accountId: 1, createdAt: -1 });

export const QuickReply: Model<IQuickReply> = mongoose.models.QuickReply || mongoose.model<IQuickReply>('QuickReply', QuickReplySchema);
