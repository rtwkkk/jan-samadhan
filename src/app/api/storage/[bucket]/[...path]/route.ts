import { NextResponse } from 'next/server';
import { getCurrentAccount } from '@/lib/auth/account';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_ROOT = path.join(process.cwd(), '.storage');

function getFilePath(bucket: string, objectPath: string[]) {
  const safePath = path.join('/', ...objectPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(STORAGE_ROOT, bucket, safePath);
}

async function checkAccess(bucket: string, objectPath: string[]): Promise<boolean> {
  const ctx = await getCurrentAccount().catch(() => null);
  if (!ctx) return false;
  
  const rootSegment = objectPath[0];
  if (bucket === 'avatars') {
    return rootSegment === ctx.userId;
  }
  return rootSegment === `account-${ctx.accountId}`;
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

export async function POST(request: Request, { params }: { params: Promise<{ bucket: string, path: string[] }> }) {
  const resolvedParams = await params;
  if (!(await checkAccess(resolvedParams.bucket, resolvedParams.path))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const filePath = getFilePath(resolvedParams.bucket, resolvedParams.path);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const buffer = Buffer.from(await request.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/api/storage/${resolvedParams.bucket}/${resolvedParams.path.join('/')}`;
  return NextResponse.json({ publicUrl, path: resolvedParams.path.join('/') });
}

export async function GET(request: Request, { params }: { params: Promise<{ bucket: string, path: string[] }> }) {
  const resolvedParams = await params;
  const filePath = getFilePath(resolvedParams.bucket, resolvedParams.path);
  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return new NextResponse(file, { headers: { 'Content-Type': contentType } });
  } catch (err) {
    return new NextResponse('Not found', { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ bucket: string, path: string[] }> }) {
  const resolvedParams = await params;
  if (!(await checkAccess(resolvedParams.bucket, resolvedParams.path))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const filePath = getFilePath(resolvedParams.bucket, resolvedParams.path);
  try {
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: true });
  }
}
