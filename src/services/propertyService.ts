import { supabase } from '@/integrations/supabase/client';
import type { PropertyDomain, PropertyBasicInfo } from '@/types/domain';
import type { Property, PropertyStatus } from '@/types';
import type { SubscriptionType } from '@/types/enums';

interface PropertyQueryParams {
  managerId?: string;
  status?: PropertyStatus;
  page?: number;
  pageSize?: number;
}

interface CreatePropertyInput {
  title: string;
  address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  description?: string | null;
  status?: PropertyStatus;
  images?: string[] | null;
  manager_id: string;
}

interface UpdatePropertyInput {
  title?: string;
  address?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  description?: string | null;
  status?: PropertyStatus;
  images?: string[] | null;
}

function mapProperty(row: Property): PropertyDomain {
  return {
    id: row.id,
    title: row.title,
    address: row.address,
    city: row.city,
    stateProvince: row.state_province,
    postalCode: row.postal_code,
    country: row.country,
    description: row.description,
    status: row.status,
    images: row.images,
    managerId: row.manager_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deleteReason: row.delete_reason,
    modificationReason: row.modification_reason,
  };
}

export async function getProperties(params: PropertyQueryParams = {}): Promise<{ properties: PropertyDomain[]; totalCount: number }> {
  const { managerId, status, page, pageSize } = params;

  let query = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (managerId) {
    query = query.eq('manager_id', managerId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (page !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { properties: (data || []).map(mapProperty), totalCount: count || 0 };
}

export async function getProperty(id: string): Promise<PropertyDomain | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProperty(data) : null;
}

export async function getPropertyBasicInfo(id: string): Promise<PropertyBasicInfo> {
  const { data, error } = await supabase
    .from('properties')
    .select('title, address')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProperty(property: CreatePropertyInput): Promise<PropertyDomain> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();
  if (error) throw error;
  return mapProperty(data);
}

export async function updateProperty({ id, updates }: { id: string; updates: UpdatePropertyInput }): Promise<PropertyDomain> {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapProperty(data);
}

export async function archiveProperty({ id, reason, notes }: { id: string; reason: string; notes?: string }): Promise<PropertyDomain> {
  const { data, error } = await supabase
    .from('properties')
    .update({
      status: 'inactive',
      deleted_at: new Date().toISOString(),
      delete_reason: reason,
      modification_reason: notes || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapProperty(data);
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updatePropertySettings(id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function getPropertiesByIds(ids: string[], page = 1, pageSize = 10): Promise<{ properties: PropertyDomain[]; totalCount: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .in('id', ids)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { properties: (data || []).map(mapProperty), totalCount: count || 0 };
}

export async function getPropertyStatusIndicators(propertyId: string) {
  const { data, error } = await supabase
    .rpc('get_property_status_indicators', { p_property_id: propertyId });
  if (error) throw error;
  return (data && data.length > 0) ? data[0] : null;
}

export async function getPropertyTenantStatus(propertyId: string) {
  const { data, error } = await supabase
    .rpc('get_property_tenant_status', { p_property_id: propertyId });
  if (error) throw error;
  return (data && data.length > 0) ? data[0] : null;
}

export const propertyService = {
  getProperties,
  getPropertiesByIds,
  getProperty,
  getPropertyBasicInfo,
  createProperty,
  updateProperty,
  archiveProperty,
  deleteProperty,
  updatePropertySettings,
  getPropertyStatusIndicators,
  getPropertyTenantStatus,
};
