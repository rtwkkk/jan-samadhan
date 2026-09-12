const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'lib', 'mongodb', 'models');

const models = {
  'Account.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount extends Document {
  _id: string;
  name: string;
  ownerUserId: string;
  defaultCurrency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  ownerUserId: { type: String, required: true, ref: 'User' },
  defaultCurrency: { type: String, default: 'USD' }
}, {
  timestamps: true,
  _id: false // because we manually provide it
});

export const Account: Model<IAccount> = mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
`,
  'User.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  accountId?: string;
  accountRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  avatarUrl: { type: String },
  accountId: { type: String, ref: 'Account' },
  accountRole: { type: String, enum: ['owner', 'admin', 'agent', 'viewer'] }
}, { timestamps: true, _id: false });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
`,
  'Contact.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  _id: string;
  accountId: string;
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
  phone: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  company: { type: String },
  avatarUrl: { type: String },
  tagIds: [{ type: String, ref: 'Tag' }],
  customFields: { type: Map, of: String, default: {} }
}, { timestamps: true, _id: false });

ContactSchema.index({ accountId: 1, phone: 1 }, { unique: true });

export const Contact: Model<IContact> = mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
`,
  'Conversation.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversation extends Document {
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

ConversationSchema.index({ accountId: 1, contactId: 1 });
ConversationSchema.index({ accountId: 1, updatedAt: -1 });

export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
`,
  'Message.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

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
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read', 'failed'], default: 'sent' }
}, { timestamps: true, _id: false });

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ messageId: 1 }, { unique: true, sparse: true });
MessageSchema.index({ accountId: 1 });

export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
`,
  'Pipeline.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPipelineStage {
  _id: string; // preserve postgres id if necessary, or let mongoose handle it? Mongoose embedded docs get ObjectIds by default, but we can override
  id: string; 
  name: string;
  position: number;
  color: string;
}

export interface IPipeline extends Document {
  _id: string;
  accountId: string;
  name: string;
  stages: IPipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  position: { type: Number, default: 0 },
  color: { type: String, default: '#3b82f6' }
}, { _id: false });

const PipelineSchema = new Schema<IPipeline>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  name: { type: String, required: true },
  stages: [PipelineStageSchema]
}, { timestamps: true, _id: false });

export const Pipeline: Model<IPipeline> = mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', PipelineSchema);
`,
  'Deal.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeal extends Document {
  _id: string;
  accountId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  conversationId?: string;
  title: string;
  value: number;
  currency: string;
  notes?: string;
  expectedCloseDate?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  pipelineId: { type: String, required: true, ref: 'Pipeline' },
  stageId: { type: String, required: true }, // referencing the embedded stage id
  contactId: { type: String, required: true, ref: 'Contact' },
  conversationId: { type: String, ref: 'Conversation' },
  title: { type: String, required: true },
  value: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  notes: { type: String },
  expectedCloseDate: { type: Date },
  status: { type: String, default: 'active' }
}, { timestamps: true, _id: false });

DealSchema.index({ accountId: 1, pipelineId: 1 });

export const Deal: Model<IDeal> = mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);
`,
  'WhatsappConfig.ts': `import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWhatsappConfig extends Document {
  _id: string;
  accountId: string;
  phoneNumberId: string;
  wabaId?: string;
  accessToken: string;
  verifyToken?: string;
  status: string;
  connectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsappConfigSchema = new Schema<IWhatsappConfig>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  phoneNumberId: { type: String, required: true },
  wabaId: { type: String },
  accessToken: { type: String, required: true },
  verifyToken: { type: String },
  status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
  connectedAt: { type: Date }
}, { timestamps: true, _id: false });

WhatsappConfigSchema.index({ accountId: 1 }, { unique: true });
WhatsappConfigSchema.index({ phoneNumberId: 1 }, { unique: true });

export const WhatsappConfig: Model<IWhatsappConfig> = mongoose.models.WhatsappConfig || mongoose.model<IWhatsappConfig>('WhatsappConfig', WhatsappConfigSchema);
`,
  'index.ts': `export * from './Account';
export * from './User';
export * from './Contact';
export * from './Conversation';
export * from './Message';
export * from './Pipeline';
export * from './Deal';
export * from './WhatsappConfig';
// Add others as needed
`
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content);
}
console.log('Models generated.');
