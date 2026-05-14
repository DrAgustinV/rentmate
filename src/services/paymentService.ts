import { supabase } from '@/integrations/supabase/client';

// ========== RENT PAYMENTS ==========

export async function getRentPayments(propertyId: string) {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('property_id', propertyId)
    .order('payment_due_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRentPayment(payment: any) {
  const { data, error } = await supabase
    .from('rent_payments')
    .insert([payment])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRentPayment(id: string, updates: any) {
  const { data, error } = await supabase
    .from('rent_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRentPaymentSimple(id: string, updates: any) {
  const { error } = await supabase
    .from('rent_payments')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ========== UTILITY PAYMENTS ==========

export async function getUtilityPayments(propertyId: string) {
  const { data, error } = await supabase
    .from('utility_payments')
    .select('*')
    .eq('property_id', propertyId)
    .order('payment_due_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createUtilityPayment(payment: any) {
  const { data, error } = await supabase
    .from('utility_payments')
    .insert([payment])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUtilityPayment(id: string, updates: any) {
  const { data, error } = await supabase
    .from('utility_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUtilityPaymentSimple(id: string, updates: any) {
  const { error } = await supabase
    .from('utility_payments')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ========== SHARED ==========

export async function getRentPaymentSummary(tenantId: string, propertyId: string) {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('payment_received_date, amount_cents')
    .eq('tenancy_id', tenantId)
    .eq('property_id', propertyId)
    .eq('status', 'paid')
    .order('payment_received_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export const paymentService = {
  getRentPayments,
  createRentPayment,
  updateRentPayment,
  updateRentPaymentSimple,
  getUtilityPayments,
  createUtilityPayment,
  updateUtilityPayment,
  updateUtilityPaymentSimple,
  getRentPaymentSummary,
};
