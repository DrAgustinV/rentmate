import { supabase } from '@/integrations/supabase/client';

export async function getUserRoles(): Promise<Array<{ user_id: string; role: string }>> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role');
  if (error) throw error;
  return data || [];
}

export async function addUserRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role });
  if (error) throw error;
}

export async function getUserSubscriptions(): Promise<Array<{
  user_id: string;
  status: string;
  subscription_type: string;
  current_period_end: string | null;
  plan: { name: string; slug: string } | null;
}>> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      user_id,
      status,
      subscription_type,
      current_period_end,
      plan:subscription_plans(name, slug)
    `);
  if (error) throw error;
  return (data || []).map((item: any) => ({
    user_id: item.user_id,
    status: item.status,
    subscription_type: item.subscription_type,
    current_period_end: item.current_period_end,
    plan: item.plan || null,
  }));
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  });
  if (error) throw error;
}

export async function addSubscriptionHistory(data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('subscription_history').insert(data);
  if (error) throw error;
}

export async function createEnterpriseContactRequest(data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('enterprise_contact_requests').insert(data);
  if (error) throw error;
}

export async function createPrivacyRequest(data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('privacy_requests').insert(data);
  if (error) throw error;
}

export async function exportUserData(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('export-user-data', { body });
  if (error) throw error;
  return data;
}

export async function deleteUserAccount(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('delete-user-account', { body });
  if (error) throw error;
  return data;
}

export async function syncStripePrices(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('sync-stripe-prices', { body });
  if (error) throw error;
  return data;
}

export async function createStripeConnectAccount(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
  if (error) throw error;
  return data;
}

export async function createSubscriptionCheckout(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', { body });
  if (error) throw error;
  return data;
}

export async function customerPortalSession(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('customer-portal-session', { body });
  if (error) throw error;
  return data;
}

export const adminService = {
  getUserRoles,
  addUserRole,
  getUserSubscriptions,
  deleteUser,
  addSubscriptionHistory,
  createEnterpriseContactRequest,
  createPrivacyRequest,
  exportUserData,
  deleteUserAccount,
  syncStripePrices,
  createStripeConnectAccount,
  createSubscriptionCheckout,
  customerPortalSession,
};
