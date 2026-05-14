// Create this new file to cache signed URLs and prevent repeated network calls
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getCachedSignedUrl(bucket: string, path: string, ttlMs = 5 * 60 * 1000): Promise<string> {
  if (!path) return '';
  const key = `${bucket}:${path}`;
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const url = await documentService.getSignedUrl(bucket, path);
  urlCache.set(key, { url, expiresAt: Date.now() + ttlMs });
  return url;
}

export function clearSignedUrlCache() {
  urlCache.clear();
}
