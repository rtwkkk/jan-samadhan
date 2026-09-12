import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { connectToDatabase } from '../mongodb/client';
import { User, IUser } from '../mongodb/models/User';
import { Session, ISession } from '../mongodb/models/Session';
import { Account, IAccount } from '../mongodb/models/Account';

const SESSION_COOKIE_NAME = 'wacrm_session';
const SESSION_MAX_AGE_DAYS = 30;
const SESSION_RENEWAL_THRESHOLD_DAYS = 15;
const SALT_ROUNDS = 12;

export interface AuthContext {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    accountRole?: string;
  };
  account: {
    id: string;
    name: string;
    defaultCurrency?: string;
  };
  userId: string;
  accountId: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  await connectToDatabase();
  
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);
  
  await Session.create({
    _id: tokenHash,
    userId,
    expiresAt,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    revokedAt: null
  });
  
  return rawToken;
}

export async function validateSession(rawToken: string): Promise<ISession | null> {
  await connectToDatabase();
  
  const tokenHash = hashSessionToken(rawToken);
  const session = await Session.findById(tokenHash).lean();
  
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  
  // Renewal check
  const timeRemaining = session.expiresAt.getTime() - Date.now();
  const thresholdMs = SESSION_RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  
  if (timeRemaining < thresholdMs) {
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + SESSION_MAX_AGE_DAYS);
    
    await Session.updateOne(
      { _id: tokenHash },
      { $set: { expiresAt: newExpiresAt, lastUsedAt: new Date() } }
    );
    session.expiresAt = newExpiresAt;
    
    // Also extend the cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60
    });
  } else {
    // Just update lastUsedAt in background
    Session.updateOne({ _id: tokenHash }, { $set: { lastUsedAt: new Date() } }).exec().catch(() => {});
  }
  
  return session;
}

export async function revokeSession(rawToken: string): Promise<void> {
  await connectToDatabase();
  const tokenHash = hashSessionToken(rawToken);
  await Session.updateOne({ _id: tokenHash }, { $set: { revokedAt: new Date() } });
}

export async function getSessionFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token || null;
}

export async function requireAuth(): Promise<AuthContext> {
  const rawToken = await getSessionFromRequest();
  if (!rawToken) {
    throw new Error('Unauthorized: No session cookie');
  }
  
  const session = await validateSession(rawToken);
  if (!session) {
    throw new Error('Unauthorized: Invalid or expired session');
  }
  
  await connectToDatabase();
  const user = await User.findById(session.userId).lean();
  if (!user) {
    throw new Error('Unauthorized: User not found');
  }
  
  if (!user.accountId || !user.accountRole) {
    throw new Error('Unauthorized: User has no account linked');
  }
  
  const account = await Account.findById(user.accountId).lean();
  if (!account) {
    throw new Error('Unauthorized: Account not found');
  }
  
  return {
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      accountRole: user.accountRole
    },
    account: {
      id: account._id,
      name: account.name,
      defaultCurrency: account.defaultCurrency
    },
    userId: user._id,
    accountId: user.accountId,
    role: user.accountRole
  };
}



export async function setSessionCookie(rawToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
