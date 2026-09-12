import { NextResponse } from 'next/server';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth/server';
import { connectToDatabase } from '@/lib/mongodb/client';
import { User } from '@/lib/mongodb/models/User';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const { current, next } = await request.json();
    
    if (!current || !next || next.length < 6) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    await connectToDatabase();
    const user = await User.findById(auth.userId).select('+passwordHash').lean();
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Cannot verify current password' }, { status: 400 });
    }
    
    const isValid = await verifyPassword(current, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });
    }
    
    const newHash = await hashPassword(next);
    await User.findByIdAndUpdate(auth.userId, { $set: { passwordHash: newHash } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
