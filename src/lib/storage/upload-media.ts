import { MEDIA_MAX_BYTES, MEDIA_MAX_BYTES_BY_KIND, buildMediaPath } from './upload-media-utils';

export { MEDIA_MAX_BYTES, MEDIA_MAX_BYTES_BY_KIND, buildMediaPath };

export interface UploadAccountMediaResult {
  publicUrl: string;
  path: string;
}

export async function uploadAccountMedia(
  bucket: string,
  file: File,
): Promise<UploadAccountMediaResult> {
  const authRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!authRes.ok) {
    throw new Error("Not signed in.");
  }
  const authData = await authRes.json();
  if (!authData.user || !authData.accountId) {
    throw new Error("Could not resolve your account.");
  }

  const path = buildMediaPath(authData.accountId as string, file.name);
  
  const res = await fetch(`/api/storage/${bucket}/${path}`, {
    method: 'POST',
    body: await file.arrayBuffer(),
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Upload failed");
  }

  const data = await res.json();
  return { publicUrl: data.publicUrl, path: data.path };
}

export async function deleteAccountMedia(
  bucket: string,
  path: string,
): Promise<void> {
  await fetch(`/api/storage/${bucket}/${path}`, { method: 'DELETE' });
}
