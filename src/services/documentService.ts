import { supabase } from '@/integrations/supabase/client';
import { BucketName, SIGNED_URL_TTL, FILE_EXISTS_PROBE_TTL } from '@/constants';
import { UploadResult } from '@/types/domain';

export async function uploadFile(
  bucket: BucketName,
  filePath: string,
  file: File | Blob,
  options?: { upsert?: boolean; cacheControl?: string }
): Promise<UploadResult> {
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: options?.upsert ?? false,
    cacheControl: options?.cacheControl,
  });
  if (error) throw error;
  return { storagePath: data.path, bucket };
}

export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, { timeout: ttlSeconds });
  if (error) throw error;
  return data.signedUrl;
}

export async function getPublicUrl(
  bucket: BucketName,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).getPublicUrl(path);
  if (error) throw error;
  return data.publicUrl;
}

export async function downloadFile(
  bucket: BucketName,
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}

export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function fileExists(
  bucket: BucketName,
  path: string
): Promise<boolean> {
  try {
    await getSignedUrl(bucket, path, FILE_EXISTS_PROBE_TTL);
    return true;
  } catch {
    return false;
  }
}

export async function listFiles(
  bucket: BucketName,
  prefix?: string
): Promise<{ name: string; createdAt: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw error;
  return (data || []) as { name: string; createdAt: string }[];
}
