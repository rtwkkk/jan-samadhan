import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessageReaction {
  emoji: string;
  actorType: 'customer' | 'agent';
  actorId?: string;
  createdAt: Date;
}

export interface IMessage extends Document<string> {
  _id: string;
  accountId: string;
  conversationId: string;
  senderType: 'customer' | 'agent' | 'bot';
  senderId?: string;
  contentType: string;
  contentText?: string;
  media?: { url: string; mimeType: string };
  messageId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: IMessageReaction[];
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IMessageReaction>({
  emoji: { type: String, required: true },
  actorType: { type: String, enum: ['customer', 'agent'], required: true },
  actorId: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  conversationId: { type: String, required: true, ref: 'Conversation' },
  senderType: { type: String, enum: ['customer', 'agent', 'bot'], required: true },
  senderId: { type: String, ref: 'User' },
  contentType: { type: String, default: 'text' },
  contentText: { type: String },
  media: {
    url: String,
    mimeType: String
  },
  messageId: { type: String },
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read', 'failed'], default: 'sent' },
  reactions: [ReactionSchema]
}, { timestamps: true, _id: false });

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, messageId: 1 }, { unique: true, sparse: true });
MessageSchema.index({ accountId: 1 });

export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
