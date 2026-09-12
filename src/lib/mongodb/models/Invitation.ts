import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvitation extends Document<string> {
  _id: string;
  accountId: string;
  tokenHash: string;
  role: string;
  createdByUserId?: string;
  label?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account', index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  role: { type: String, required: true, enum: ['admin', 'agent', 'viewer'] },
  createdByUserId: { type: String, ref: 'User' },
  label: { type: String },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date },
  acceptedByUserId: { type: String, ref: 'User' }
}, {
  timestamps: true,
  _id: false
});

// TTL index to automatically purge expired invitations after some buffer if desired,
// but for audit history, often we just keep them. The user prompt says "Add appropriate indexes for accountId/tokenHash and expiry."
InvitationSchema.index({ expiresAt: 1 });

export const Invitation: Model<IInvitation> = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema);
