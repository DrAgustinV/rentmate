import { supabase } from '@/integrations/supabase/client';

// ========== RENT AGREEMENTS ==========

export async function getActiveRentAgreement(tenancyId: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRentAgreementForEdit(id: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('tenancy_id, property_id')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveSignature(tenancyId: string) {
  const { data, error } = await supabase
    .from('contract_signatures')
    .select('workflow_status')
    .eq('tenancy_id', tenancyId)
    .in('workflow_status', ['pending', 'in_progress'])
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContractSignatureStatus(tenancyId: string) {
  const { data, error } = await supabase
    .from('contract_signatures')
    .select('workflow_status')
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRentAgreementsForProperty(propertyId: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select(`*, tenant:profiles!rent_agreements_tenant_id_fkey (id, first_name, last_name, email)`)
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRentAgreement(data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from('rent_agreements')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateRentAgreement(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTenancyDocuments(tenancyId: string) {
  const { data, error } = await supabase
    .from('property_documents')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any[];
}

export async function getLatestSignatureDocument(tenancyId: string) {
  const { data, error } = await supabase
    .from('property_documents')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .eq('document_category', 'tenancy')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data && data.length > 0) ? data[0] : null;
}

export async function getPropertyManagerId(propertyId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('manager_id')
    .eq('id', propertyId)
    .single();
  if (error) throw error;
  return data?.manager_id;
}

export async function getPropertyTenantsForManager(propertyId: string, managerId: string) {
  const { data, error } = await supabase
    .from('property_tenants')
    .select('*')
    .eq('property_id', propertyId)
    .eq('tenancy_status', 'active');
  if (error) throw error;
  return data || [];
}

export async function getTenantPropertiesForUser(userId: string) {
  const { data, error } = await supabase
    .from('property_tenants')
    .select('property_id')
    .eq('tenant_id', userId)
    .in('tenancy_status', ['active', 'ending_tenancy']);
  if (error) throw error;
  return data || [];
}

export async function checkActiveTenancy(propertyId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('property_tenants')
    .select('id')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .in('tenancy_status', ['active', 'ending_tenancy'])
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ========== PROPERTY TENANTS MUTATIONS ==========

export async function updatePropertyTenantStatus(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('property_tenants')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function updateRentAgreementSimple(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('rent_agreements')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function getTenantPropertyIds(tenantId: string) {
  const { data, error } = await supabase
    .from('property_tenants')
    .select('property_id')
    .eq('tenant_id', tenantId);
  if (error) throw error;
  return data || [];
}

export async function getTenancyStartDate(propertyId: string, tenancyId: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('start_date')
    .eq('property_id', propertyId)
    .eq('tenancy_id', tenancyId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data?.start_date || null;
}

export async function getRentAgreementBasicInfo(propertyId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('rent_amount_cents, currency, start_date, end_date')
    .eq('property_id', propertyId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPropertyTenant(data: Record<string, unknown>) {
  const { error } = await supabase
    .from('property_tenants')
    .insert(data);
  if (error) throw error;
}

export async function manageTenancyLimit(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('manage-tenancy-limit', { body });
  if (error) throw error;
  return data;
}

export async function initiateYousignSignature(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-yousign-signature', { body });
  if (error) throw error;
  return data;
}

export async function sendYousignReminder(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('send-yousign-reminder', { body });
  if (error) throw error;
  return data;
}

export async function getMandateInfo(agreementId: string) {
  const { data, error } = await supabase
    .from('rent_agreements')
    .select('mandate_id, mandate_status, mandate_pdf_url, mandate_signed_at, tenant_iban')
    .eq('id', agreementId)
    .single();
  if (error) throw error;
  return data;
}

export const tenancyService = {
  getActiveRentAgreement,
  getRentAgreementForEdit,
  getActiveSignature,
  getContractSignatureStatus,
  getRentAgreementsForProperty,
  createRentAgreement,
  updateRentAgreement,
  getTenancyDocuments,
  getLatestSignatureDocument,
  getPropertyManagerId,
  getPropertyTenantsForManager,
  getTenantPropertiesForUser,
  checkActiveTenancy,
  updatePropertyTenantStatus,
  updateRentAgreementSimple,
  getTenantPropertyIds,
  getTenancyStartDate,
  getRentAgreementBasicInfo,
  getMandateInfo,
  manageTenancyLimit,
  initiateYousignSignature,
  sendYousignReminder,
  createPropertyTenant,
};
