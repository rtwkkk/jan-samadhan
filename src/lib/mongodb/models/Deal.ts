import mongoose, { Schema, Document, Model } from 'mongoose';

export type DealStatus = 'open' | 'won' | 'lost';

export interface IDeal extends Document<string> {
  _id: string;
  accountId: string;
  pipelineId: string;
  stageId: string;
  /** Nullable: becomes null when the referenced contact is deleted (SET NULL semantics). */
  contactId?: string | null;
  conversationId?: string;
  /** Optional FK to User._id (formerly deals.assigned_to → profiles.id). */
  assignedTo?: string;
  title: string;
  value: number;
  currency: string;
  notes?: string;
  expectedCloseDate?: Date;
  status: DealStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  pipelineId: { type: String, required: true, ref: 'Pipeline' },
  stageId: { type: String, required: true }, // references the embedded stage id
  contactId: { type: String, ref: 'Contact', default: null },
  conversationId: { type: String, ref: 'Conversation' },
  assignedTo: { type: String, ref: 'User' },
  title: { type: String, required: true },
  value: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  notes: { type: String },
  expectedCloseDate: { type: Date },
  status: {
    type: String,
    enum: ['open', 'won', 'lost'],
    default: 'open',
    required: true,
  },
}, { timestamps: true, _id: false });

DealSchema.index({ accountId: 1, pipelineId: 1 });
DealSchema.index({ accountId: 1, contactId: 1 });
DealSchema.index({ accountId: 1, status: 1 });

export const Deal: Model<IDeal> = mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);
