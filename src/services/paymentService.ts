import { supabase } from '@/integrations/supabase/client';
import type { PaymentDomain, UtilityPaymentDomain } from '@/types/domain';
import type { PaymentStatus, UtilityPaymentStatus, UtilityType } from '@/types/enums';

interface RentPaymentInput {
  property_id: string;
  tenancy_id: string;
  tenant_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  payment_due_date: string;
  payment_received_date?: string;
  notes?: string;
  proof_path?: string;
}

interface RentPaymentUpdates {
  status?: PaymentStatus;
  payment_received_date?: string;
  proof_path?: string;
  notes?: string;
}

interface UtilityPaymentInput {
  property_id: string;
  type: UtilityType;
  amount_cents: number;
  currency: string;
  status: UtilityPaymentStatus;
  payment_due_date: string;
  payment_received_date?: string;
  provider: string;
  proof_path?: string;
}

interface UtilityPaymentUpdates {
  status?: UtilityPaymentStatus;
  payment_received_date?: string;
  proof_path?: string;
}

export interface BackfillPaymentInput {
  rent_agreement_id?: string;
  tenancy_id: string;
  property_id: string;
  tenant_id: string;
  manager_id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  payment_received_date: string;
  status: 'paid';
  notes?: string;
}

// ========== RENT PAYMENTS ==========

export async function getRentPayments(propertyId: string): Promise<PaymentDomain[]> {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('property_id', propertyId)
    .order('payment_due_date', { ascending: false });
  if (error) throw error;
  return (data || []) as PaymentDomain[];
}

export async function createRentPayment(payment: RentPaymentInput): Promise<PaymentDomain> {
  const { data, error } = await supabase
    .from('rent_payments')
    .insert([payment])
    .select()
    .single();
  if (error) throw error;
  return data as PaymentDomain;
}

export async function updateRentPayment(id: string, updates: RentPaymentUpdates): Promise<PaymentDomain> {
  const { data, error } = await supabase
    .from('rent_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PaymentDomain;
}

export async function updateRentPaymentSimple(id: string, updates: RentPaymentUpdates): Promise<void> {
  const { error } = await supabase
    .from('rent_payments')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ========== UTILITY PAYMENTS ==========

export async function getUtilityPayments(propertyId: string): Promise<UtilityPaymentDomain[]> {
  const { data, error } = await supabase
    .from('utility_payments')
    .select('*')
    .eq('property_id', propertyId)
    .order('payment_due_date', { ascending: false });
  if (error) throw error;
  return (data || []) as UtilityPaymentDomain[];
}

export async function createUtilityPayment(payment: UtilityPaymentInput): Promise<UtilityPaymentDomain> {
  const { data, error } = await supabase
    .from('utility_payments')
    .insert([payment])
    .select()
    .single();
  if (error) throw error;
  return data as UtilityPaymentDomain;
}

export async function updateUtilityPayment(id: string, updates: UtilityPaymentUpdates): Promise<UtilityPaymentDomain> {
  const { data, error } = await supabase
    .from('utility_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as UtilityPaymentDomain;
}

export async function updateUtilityPaymentSimple(id: string, updates: UtilityPaymentUpdates): Promise<void> {
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

export async function backfillRentPayments(payments: BackfillPaymentInput[]) {
  const { data, error } = await supabase
    .from('rent_payments')
    .insert(payments)
    .select();
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
  backfillRentPayments,
};
