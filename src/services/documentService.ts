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
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
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

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('property_documents').delete().eq('id', id);
  if (error) throw error;
}

export async function insertDocument(data: Record<string, unknown>) {
  const { data: result, error } = await supabase.from('property_documents').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function uploadDocumentTemplate(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('upload-document-template', { body });
  if (error) throw error;
  return data;
}

export async function getTemplatesByProperty(propertyId: string): Promise<Array<{ id: string; document_title: string }>> {
  const { data, error } = await supabase
    .from('property_documents')
    .select('id, document_title')
    .eq('document_category', 'template')
    .or(`property_id.eq.${propertyId},property_id.is.null`)
    .eq('is_latest_version', true)
    .order('document_title');
  if (error) throw error;
  return data || [];
}

export async function listFiles(
  bucket: BucketName,
  prefix?: string
): Promise<{ name: string; created_at: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix);
  if (error) throw error;
  return (data || []) as { name: string; created_at: string }[];
}

export const documentService = {
  uploadFile,
  getSignedUrl,
  getPublicUrl,
  downloadFile,
  deleteFile,
  fileExists,
  deleteDocument,
  insertDocument,
  uploadDocumentTemplate,
  getTemplatesByProperty,
  listFiles,
};
