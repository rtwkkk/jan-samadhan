import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document<string> {
  _id: string; // SHA-256 hash of the session token
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
}

const SessionSchema = new Schema<ISession>({
  _id: { type: String, required: true },
  userId: { type: String, required: true, ref: 'User' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null }
}, {
  _id: false // We provide the hash manually
});

// TTL index to automatically clean up expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
