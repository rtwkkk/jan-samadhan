import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessageTemplate extends Document<string> {
  _id: string;
  accountId: string;
  userId: string;
  name: string;
  category: 'Marketing' | 'Utility' | 'Authentication';
  language: string;
  headerType?: 'text' | 'image' | 'video' | 'document';
  headerContent?: string;
  headerHandle?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  buttons?: any[]; // Array of TemplateButton
  sampleValues?: any; // TemplateSampleValues
  status?: string;
  metaTemplateId?: string;
  rejectionReason?: string;
  qualityScore?: 'GREEN' | 'YELLOW' | 'RED';
  submissionError?: string;
  lastSubmittedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema = new Schema<IMessageTemplate>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Marketing', 'Utility', 'Authentication'] },
  language: { type: String, required: true },
  headerType: { type: String, enum: ['text', 'image', 'video', 'document'] },
  headerContent: { type: String },
  headerHandle: { type: String },
  headerMediaUrl: { type: String },
  bodyText: { type: String, required: true },
  footerText: { type: String },
  buttons: { type: Schema.Types.Mixed },
  sampleValues: { type: Schema.Types.Mixed },
  status: { type: String, default: 'PENDING' },
  metaTemplateId: { type: String },
  rejectionReason: { type: String },
  qualityScore: { type: String, enum: ['GREEN', 'YELLOW', 'RED'] },
  submissionError: { type: String },
  lastSubmittedAt: { type: Date },
}, { timestamps: true, _id: false });

// Uniqueness logic: A template name + language must be unique within an account.
MessageTemplateSchema.index({ accountId: 1, name: 1, language: 1 }, { unique: true });

export const MessageTemplate: Model<IMessageTemplate> = mongoose.models.MessageTemplate || mongoose.model<IMessageTemplate>('MessageTemplate', MessageTemplateSchema);
