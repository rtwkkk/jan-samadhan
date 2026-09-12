import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';

export async function GET() {
  try {
    const auth = await requireAuth();
    return NextResponse.json(auth);
  } catch (error: any) {
    // Expected if not logged in
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    
    const body = await request.json().catch(() => null) as {
      full_name?: unknown;
      avatar_url?: unknown;
      email?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const updates: any = {};
    if (typeof body.full_name === 'string') {
      updates.fullName = body.full_name.trim();
    }
    if (body.avatar_url !== undefined) {
      updates.avatarUrl = typeof body.avatar_url === 'string' ? body.avatar_url : null;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { connectToDatabase } = await import('@/lib/mongodb/client');
    const { User } = await import('@/lib/mongodb/models/User');
    
    await connectToDatabase();
    await User.findByIdAndUpdate(auth.userId, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
