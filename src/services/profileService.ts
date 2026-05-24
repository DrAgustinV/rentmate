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
    defaultRole: (row as Record<string, unknown>).default_role as 'manager' | 'tenant' | null,
    emailVerified: row.email_verified,
    kycStatus: row.kyc_status,
    kycProvider: row.kyc_provider,
    kycQrCodeUrl: row.kyc_qr_code_url,
    kycExpiresAt: row.kyc_expires_at,
    kycWalletDid: row.kyc_wallet_did,
    kycCredentialId: row.kyc_credential_id,
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
  defaultRole?: 'manager' | 'tenant' | null;
}): Promise<ProfileDomain> {
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.first_name = data.firstName;
  if (data.lastName !== undefined) updateData.last_name = data.lastName;
  if (data.avatarStoragePath !== undefined) updateData.avatar_url = data.avatarStoragePath;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.defaultRole !== undefined) updateData.default_role = data.defaultRole;
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

export async function getDefaultRole(userId: string): Promise<'manager' | 'tenant' | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('default_role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data?.default_role === 'manager' || data?.default_role === 'tenant') return data.default_role;
  return null;
}

export async function updateDefaultRole(userId: string, role: 'manager' | 'tenant'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ default_role: role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
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
  const updateData: Record<string, unknown> = {
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
  getDefaultRole,
  updateDefaultRole,
};

export interface OnboardingProgress {
  welcome_seen?: boolean;
  checklist_completed?: boolean;
  tour_taken?: boolean;
  rentals_tour_taken?: boolean;
  property_created?: boolean;
  tenancy_created?: boolean;
  contract_uploaded?: boolean;
}

export async function updateOnboardingProgress(
  userId: string,
  progress: Partial<OnboardingProgress>
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('profiles')
    .select('onboarding_progress')
    .eq('id', userId)
    .maybeSingle();
  
  if (fetchError) throw fetchError;
  
  const existing = (current?.onboarding_progress as Record<string, boolean>) || {};
  const updated = { ...existing, ...progress };
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      onboarding_progress: updated,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) throw error;
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_progress')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.onboarding_progress as OnboardingProgress | null;
}

function isTourTakenLocally(userId: string, key: string): boolean {
  return localStorage.getItem(`tour_taken_${userId}_${key}`) === "true";
}

export async function shouldShowTour(userId: string): Promise<boolean> {
  if (isTourTakenLocally(userId, "properties")) return false;
  try {
    const progress = await getOnboardingProgress(userId);
    return !progress?.tour_taken;
  } catch (err) {
    console.warn("Failed to fetch onboarding progress (tour):", err);
    return true;
  }
}

export function shouldShowRoleSwitchTour(userId: string, role: "manager" | "tenant"): boolean {
  const key = `role_switch_tour_${userId}_${role}`;
  return localStorage.getItem(key) !== "true";
}

export function markRoleSwitchTourSeen(userId: string, role: "manager" | "tenant"): void {
  const key = `role_switch_tour_${userId}_${role}`;
  localStorage.setItem(key, "true");
}

export async function shouldShowRentalsTour(userId: string): Promise<boolean> {
  if (isTourTakenLocally(userId, "rentals")) return false;
  try {
    const progress = await getOnboardingProgress(userId);
    return !progress?.rentals_tour_taken;
  } catch (err) {
    console.warn("Failed to fetch onboarding progress (rentals tour):", err);
    return true;
  }
}
