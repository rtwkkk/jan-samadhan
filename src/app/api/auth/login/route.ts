import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import { User } from '@/lib/mongodb/models/User';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth/server';

// Simplistic rate limiting for single-instance (in-memory)
const loginAttempts = new Map<string, { count: number, resetAt: number }>();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateKey = `${ip}:${email.toLowerCase().trim()}`;
    
    const now = Date.now();
    const attempt = loginAttempts.get(rateKey) || { count: 0, resetAt: now + 15 * 60 * 1000 };
    if (attempt.resetAt < now) {
      attempt.count = 0;
      attempt.resetAt = now + 15 * 60 * 1000;
    }
    if (attempt.count >= 10) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }
    
    await connectToDatabase();
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    
    if (!user || !user.passwordHash) {
      attempt.count++;
      loginAttempts.set(rateKey, attempt);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      attempt.count++;
      loginAttempts.set(rateKey, attempt);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    
    // Success, reset attempts
    loginAttempts.delete(rateKey);
    
    const rawToken = await createSession(user._id);
    await setSessionCookie(rawToken);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
