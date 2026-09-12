import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_ROOT = path.join(process.cwd(), '.storage');

export const localMediaStorage = {
  from(bucket: string) {
    return {
      async upload(
        objectPath: string,
        body: Uint8Array | Buffer,
        options: { contentType: string; cacheControl: string; upsert: boolean },
      ): Promise<{ error: { message: string } | null }> {
        try {
          const safePath = path.join('/', ...objectPath.split('/')).replace(/^(\.\.(\/|\\|$))+/, '');
          const filePath = path.join(STORAGE_ROOT, bucket, safePath);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, Buffer.from(body));
          return { error: null };
        } catch (err: any) {
          return { error: { message: err.message } };
        }
      },
      getPublicUrl(objectPath: string): { data: { publicUrl: string } } {
        const safePath = objectPath.split('/').map(encodeURIComponent).join('/');
        return { data: { publicUrl: `/api/storage/${bucket}/${safePath}` } };
      }
    };
  }
};
