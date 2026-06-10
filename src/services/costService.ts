import { supabase } from '@/integrations/supabase/client';
import type { PropertyCostDomain } from '@/types/domain';

export interface CreateCostInput {
  property_id: string;
  cost_category: string;
  description?: string | null;
  amount_cents: number;
  currency?: string;
  due_date?: string | null;
  paid_date?: string | null;
  status?: string;
  recurrence?: string;
  notes?: string | null;
}

export interface UpdateCostInput {
  cost_category?: string;
  description?: string | null;
  amount_cents?: number;
  currency?: string;
  due_date?: string | null;
  paid_date?: string | null;
  status?: string;
  recurrence?: string;
  notes?: string | null;
}

function mapCost(row: Record<string, unknown>): PropertyCostDomain {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    costCategory: row.cost_category as string,
    description: row.description as string | null,
    amountCents: row.amount_cents as number,
    currency: row.currency as string,
    dueDate: row.due_date as string | null,
    paidDate: row.paid_date as string | null,
    status: row.status as 'pending' | 'paid',
    recurrence: row.recurrence as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getPropertyCosts(propertyId: string): Promise<PropertyCostDomain[]> {
  const { data, error } = await supabase
    .from('property_costs')
    .select('*')
    .eq('property_id', propertyId)
    .order('due_date', { ascending: false, nullsLast: true });
  if (error) throw error;
  return (data || []).map(mapCost);
}

export async function createPropertyCost(input: CreateCostInput): Promise<PropertyCostDomain> {
  const { data, error } = await supabase
    .from('property_costs')
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return mapCost(data as unknown as Record<string, unknown>);
}

export async function updatePropertyCost(id: string, updates: UpdateCostInput): Promise<PropertyCostDomain> {
  const { data, error } = await supabase
    .from('property_costs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCost(data as unknown as Record<string, unknown>);
}

export async function deletePropertyCost(id: string): Promise<void> {
  const { error } = await supabase
    .from('property_costs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export interface BackfillCostInput {
  property_id: string;
  cost_category: string;
  description?: string | null;
  amount_cents: number;
  currency?: string;
  due_date: string;
  status?: string;
  recurrence?: string;
  notes?: string | null;
  original_cost_id?: string;
}

export async function backfillPropertyCosts(costs: BackfillCostInput[]) {
  const { data, error } = await supabase
    .from('property_costs')
    .insert(costs)
    .select();
  if (error) throw error;
  return data || [];
}

export const costService = {
  getPropertyCosts,
  createPropertyCost,
  updatePropertyCost,
  deletePropertyCost,
  backfillPropertyCosts,
};
