import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversation extends Document<string> {
  _id: string;
  accountId: string;
  contactId: string;
  status: 'open' | 'pending' | 'closed';
  assignedAgentId?: string;
  lastMessageText?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  contactId: { type: String, required: true, ref: 'Contact' },
  status: { type: String, enum: ['open', 'pending', 'closed'], default: 'open' },
  assignedAgentId: { type: String, ref: 'User' },
  lastMessageText: { type: String },
  lastMessageAt: { type: Date },
  unreadCount: { type: Number, default: 0 }
}, { timestamps: true, _id: false });

ConversationSchema.index({ accountId: 1, contactId: 1 }, { unique: true });
ConversationSchema.index({ accountId: 1, updatedAt: -1 });

export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
