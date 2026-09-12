import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApiKey extends Document<string> {
  _id: string;
  accountId: string;
  createdBy?: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  _id: { type: String, required: true },
  accountId: { type: String, required: true, ref: 'Account', index: true },
  createdBy: { type: String, ref: 'User' },
  name: { type: String, required: true },
  keyPrefix: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true, select: false },
  scopes: { type: [String], required: true, default: [] },
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  revokedAt: { type: Date }
}, {
  timestamps: true,
  _id: false
});

ApiKeySchema.index({ accountId: 1, createdAt: -1 });

export const ApiKey: Model<IApiKey> = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
