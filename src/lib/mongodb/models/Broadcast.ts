import mongoose, { Schema, Document, Model } from 'mongoose';

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';

export interface IBroadcast extends Document<string> {
  _id: string;
  accountId: string;
  userId: string;
  name: string;
  templateName: string;
  templateLanguage: string;
  templateVariables?: Record<string, unknown>;
  audienceFilter?: Record<string, unknown>;
  scheduledAt?: Date;
  status: BroadcastStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  templateName: { type: String, required: true },
  templateLanguage: { type: String, required: true },
  templateVariables: { type: Schema.Types.Mixed },
  audienceFilter: { type: Schema.Types.Mixed },
  scheduledAt: { type: Date },
  status: { type: String, required: true },
  totalRecipients: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  repliedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
}, { timestamps: true });

BroadcastSchema.index({ accountId: 1, createdAt: -1 });

export const Broadcast: Model<IBroadcast> = mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema);
