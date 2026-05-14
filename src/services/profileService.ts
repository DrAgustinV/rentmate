import { supabase } from '@/integrations/supabase/client';
import type { ProfileDomain } from '@/types/domain';
import type { Profile } from '@/types';

function mapProfile(row: Profile): ProfileDomain {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarStoragePath: row.avatar_url,
    phone: row.phone,
    emailVerified: row.email_verified,
    kycStatus: row.kyc_status,
    kycVerifiedAt: row.kyc_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(userId: string): Promise<ProfileDomain | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function getAllProfiles(): Promise<ProfileDomain[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function getProfileByEmail(email: string): Promise<ProfileDomain | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function updateProfile(userId: string, data: {
  firstName?: string | null;
  lastName?: string | null;
  avatarStoragePath?: string | null;
  phone?: string | null;
  email?: string;
}): Promise<ProfileDomain> {
  const updateData: Record<string, any> = {};
  if (data.firstName !== undefined) updateData.first_name = data.firstName;
  if (data.lastName !== undefined) updateData.last_name = data.lastName;
  if (data.avatarStoragePath !== undefined) updateData.avatar_url = data.avatarStoragePath;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  updateData.updated_at = new Date().toISOString();

  const { data: updatedRow, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProfile(updatedRow);
}

export async function updateAvatarStoragePath(userId: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: storagePath, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function getKycStatus(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('kyc_status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.kyc_status || null;
}

export async function updateKycData(userId: string, data: {
  kycStatus: string;
  kycProvider?: string;
  kycVerifiedAt?: string;
}): Promise<void> {
  const updateData: Record<string, any> = {
    kyc_status: data.kycStatus,
    updated_at: new Date().toISOString(),
  };
  if (data.kycProvider !== undefined) updateData.kyc_provider = data.kycProvider;
  if (data.kycVerifiedAt !== undefined) updateData.kyc_verified_at = data.kycVerifiedAt;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
  if (error) throw error;
}

export const profileService = {
  getProfile,
  getAllProfiles,
  getProfileByEmail,
  updateProfile,
  updateAvatarStoragePath,
  getKycStatus,
  updateKycData,
};
