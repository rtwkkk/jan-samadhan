import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document<string> {
  _id: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  avatarUrl?: string;
  accountId?: string;
  accountRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, select: false },
  fullName: { type: String, required: true },
  avatarUrl: { type: String },
  accountId: { type: String, ref: 'Account' },
  accountRole: { type: String, enum: ['owner', 'admin', 'agent', 'viewer'] }
}, { timestamps: true, _id: false });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
