import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount extends Document<string> {
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
