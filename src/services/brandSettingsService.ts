import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/types';

export interface BrandSettingsRow {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_background_color: string;
  header_background_opacity: number;
  custom_domain: string | null;
  carousel_items: Json | null;
  updated_by: string | null;
  updated_at: string;
}

export async function getBrandSettings(): Promise<BrandSettingsRow | null> {
  const { data, error } = await supabase
    .from('brand_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateBrandSettings(
  id: string,
  updates: Partial<Omit<BrandSettingsRow, 'id'>>
): Promise<BrandSettingsRow[]> {
  const { data, error } = await supabase
    .from('brand_settings')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Failed to save changes. You may not have permission to update brand settings.');
  }
  return data;
}

export const brandSettingsService = {
  getBrandSettings,
  updateBrandSettings,
};
