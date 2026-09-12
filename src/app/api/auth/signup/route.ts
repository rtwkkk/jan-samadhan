import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import { User } from '@/lib/mongodb/models/User';
import { Account } from '@/lib/mongodb/models/Account';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();
    
    if (!email || !password || !fullName || password.length < 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }
    
    const passwordHash = await hashPassword(password);
    
    // Create User and Account (pseudo-transaction for standalone MongoDB without replica set, but standard works well)
    // Here we create Account first, then User. Or User, then Account, then update User.
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    
    const newAccount = await Account.create({
      _id: accountId,
      name: `${fullName}'s Account`,
      ownerUserId: userId,
      defaultCurrency: 'USD'
    });
    
    const newUser = await User.create({
      _id: userId,
      email: normalizedEmail,
      fullName,
      passwordHash,
      accountId: accountId,
      accountRole: 'owner'
    });
    
    const rawToken = await createSession(newUser._id);
    await setSessionCookie(rawToken);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Signup error:', error);
    // Handle unique constraint violation just in case
    if (error.code === 11000) {
       return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
