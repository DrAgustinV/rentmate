import { supabase } from '@/integrations/supabase/client';
import type { TenancyDomain, InvitationDomain, RentAgreementDomain } from '@/types/domain';
import type { PropertyTenant, Invitation, RentAgreement, Property, Profile } from '@/types';

type PropertyTenantJoined = PropertyTenant & {
  properties: Pick<Property, 'title' | 'address'> | null;
  profiles: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null;
};

type InvitationJoined = Invitation & {
  properties: Pick<Property, 'title'> | null;
};

function mapToTenancyDomain(row: PropertyTenantJoined): TenancyDomain {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title || '',
    propertyAddress: row.properties?.address || null,
    tenantId: row.tenant_id,
    tenantFirstName: row.profiles?.first_name || null,
    tenantLastName: row.profiles?.last_name || null,
    tenantEmail: row.profiles?.email || '',
    status: row.tenancy_status,
    startDate: row.started_at,
    plannedEndDate: row.planned_ending_date || null,
    endedAt: row.ended_at || null,
    endReason: row.end_reason || null,
    notes: row.notes || null,
    createdAt: row.created_at,
  };
}

function mapToInvitationDomain(row: InvitationJoined): InvitationDomain {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title || '',
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    token: row.token,
    invitedUserId: row.invited_user_id || null,
    tenancyRequirementsId: row.tenancy_requirements_id || null,
  };
}

function mapToRentAgreementDomain(row: RentAgreement): RentAgreementDomain {
  return {
    id: row.id,
    propertyId: row.property_id,
    tenancyId: row.tenancy_id,
    tenantId: row.tenant_id,
    managerId: row.manager_id,
    rentAmountCents: row.rent_amount_cents,
    paymentDay: row.payment_day,
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date || null,
    isActive: row.is_active,
    mandateId: row.mandate_id || null,
    mandateStatus: row.mandate_status,
    tenantIban: row.tenant_iban || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTenanciesByProperty(propertyId: string): Promise<TenancyDomain[]> {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(`
      *,
      properties (title, address),
      profiles (first_name, last_name, email)
    `)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToTenancyDomain);
}

export async function getTenanciesByManager(managerId: string): Promise<TenancyDomain[]> {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(`
      *,
      properties (title, address),
      profiles (first_name, last_name, email)
    `)
    .eq('properties.manager_id', managerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToTenancyDomain);
}

export async function getTenanciesByTenant(tenantId: string): Promise<TenancyDomain[]> {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(`
      *,
      properties (title, address),
      profiles (first_name, last_name, email)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToTenancyDomain);
}

export async function getTenancy(tenancyId: string): Promise<TenancyDomain | null> {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(`
      *,
      properties (title, address),
      profiles (first_name, last_name, email)
    `)
    .eq('id', tenancyId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToTenancyDomain(data) : null;
}

export async function getActiveTenancyForProperty(propertyId: string): Promise<TenancyDomain | null> {
  const { data, error } = await supabase
    .from('property_tenants')
    .select(`
      *,
      properties (title, address),
      profiles (first_name, last_name, email)
    `)
    .eq('property_id', propertyId)
    .in('tenancy_status', ['active', 'ending_tenancy', 'pending'])
    .maybeSingle();
  if (error) throw error;
  return data ? mapToTenancyDomain(data) : null;
}

export async function getInvitationsByProperty(propertyId: string, options?: { status?: string; daysWindow?: number }): Promise<InvitationDomain[]> {
  let query = supabase
    .from('invitations')
    .select(`
      *,
      properties (title)
    `)
    .eq('property_id', propertyId);

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.daysWindow) {
    const date = new Date();
    date.setDate(date.getDate() - options.daysWindow);
    query = query.gte('created_at', date.toISOString());
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapToInvitationDomain);
}

export async function getInvitationByToken(token: string): Promise<InvitationDomain | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      properties (title)
    `)
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToInvitationDomain(data) : null;
}

export async function getRentAgreement(tenancyId: string): Promise<RentAgreementDomain | null> {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapToRentAgreementDomain(data) : null;
}

export async function getRentAgreementsByProperty(propertyId: string): Promise<RentAgreementDomain[]> {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('*')
    .eq('property_id', propertyId);
  if (error) throw error;
  return (data || []).map(mapToRentAgreementDomain);
}

export async function createInvitation(data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('invitations').insert(data);
  if (error) throw error;
}

export const tenantService = {
  getTenanciesByProperty,
  getTenanciesByManager,
  getTenanciesByTenant,
  getTenancy,
  getActiveTenancyForProperty,
  getInvitationsByProperty,
  getInvitationByToken,
  createInvitation,
  getRentAgreement,
  getRentAgreementsByProperty,
};
