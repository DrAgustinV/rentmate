import { documentService } from '@/services';
import { BucketName } from '@/constants';

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getCachedSignedUrl(
  bucket: BucketName,
  path: string,
  ttlSeconds: number = 3600
): Promise<string> {
  if (!path) return '';

  const key = `${bucket}:${path}`;
  const cached = urlCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now + (5 * 60 * 1000)) {
    return cached.url;
  }

  const url = await documentService.getSignedUrl(bucket, path, ttlSeconds);
  urlCache.set(key, {
    url,
    expiresAt: now + (ttlSeconds * 1000)
  });

  return url;
}

export function clearSignedUrlCache() {
  urlCache.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of urlCache.entries()) {
    if (value.expiresAt <= now) {
      urlCache.delete(key);
    }
  }
}, 5 * 60 * 1000);
