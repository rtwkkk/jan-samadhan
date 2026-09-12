import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 'conversation_assigned';

export interface INotification extends Document<string> {
  _id: string;
  accountId: string;
  userId: string;
  type: NotificationType;
  conversationId?: string;
  contactId?: string;
  actorUserId?: string;
  title: string;
  body?: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  userId: { type: String, required: true, ref: 'User' },
  type: { type: String, required: true },
  conversationId: { type: String, ref: 'Conversation' },
  contactId: { type: String, ref: 'Contact' },
  actorUserId: { type: String, ref: 'User' },
  title: { type: String, required: true },
  body: { type: String },
  readAt: { type: Date, default: null }
}, { timestamps: true });

NotificationSchema.index({ accountId: 1, userId: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
