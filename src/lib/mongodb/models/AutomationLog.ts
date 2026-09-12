import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAutomationLog extends Document<string> {
  _id: string;
  accountId: string;
  triggerEvent: string;
  status: string;
  automationName?: string;
  contactId?: string; // We'll populate this with Contact
  createdAt: Date;
}

const AutomationLogSchema = new Schema<IAutomationLog>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  triggerEvent: { type: String, required: true },
  status: { type: String, required: true },
  automationName: { type: String },
  contactId: { type: String, ref: 'Contact' },
}, { timestamps: true });

AutomationLogSchema.index({ accountId: 1, createdAt: -1 });

export const AutomationLog: Model<IAutomationLog> = mongoose.models.AutomationLog || mongoose.model<IAutomationLog>('AutomationLog', AutomationLogSchema);
