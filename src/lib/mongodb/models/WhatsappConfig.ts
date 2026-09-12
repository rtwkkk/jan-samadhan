import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWhatsappConfig extends Document<string> {
  _id: string;
  accountId: string;
  phoneNumberId: string;
  wabaId?: string;
  accessToken: string;         // encrypted
  verifyToken?: string;        // encrypted, nullable
  status: string;
  connectedAt?: Date | null;
  registeredAt?: Date | null;  // set when /register succeeded on Meta
  subscribedAppsAt?: Date | null; // set when WABA subscription succeeded
  lastRegistrationError?: string | null;
  mirrorInboundMedia: boolean; // whether to mirror inbound media to storage
  createdAt: Date;
  updatedAt: Date;
}

const WhatsappConfigSchema = new Schema<IWhatsappConfig>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account' },
  phoneNumberId: { type: String, required: true },
  wabaId: { type: String },
  accessToken: { type: String, required: true },
  verifyToken: { type: String, default: null },
  status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
  connectedAt: { type: Date, default: null },
  registeredAt: { type: Date, default: null },
  subscribedAppsAt: { type: Date, default: null },
  lastRegistrationError: { type: String, default: null },
  mirrorInboundMedia: { type: Boolean, default: true },
}, { timestamps: true, _id: false });

WhatsappConfigSchema.index({ accountId: 1 }, { unique: true });
WhatsappConfigSchema.index({ phoneNumberId: 1 }, { unique: true });

export const WhatsappConfig: Model<IWhatsappConfig> = mongoose.models.WhatsappConfig || mongoose.model<IWhatsappConfig>('WhatsappConfig', WhatsappConfigSchema);
