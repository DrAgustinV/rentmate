import { supabase } from '@/integrations/supabase/client';

export async function initiateKiltKYC(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-kilt-kyc');
  if (error) throw error;
  return data;
}

export async function initiateDiditKYC(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-didit-kyc');
  if (error) throw error;
  return data;
}

export async function initiateOpenAPIKYC(level?: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-openapi-kyc', {
    body: { level: level || 'basic' },
  });
  if (error) throw error;
  return data;
}

export async function checkDiditKYCStatus(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('check-didit-kyc-status');
  if (error) throw error;
  return data;
}

export async function generateSEPAMandatePDF(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('generate-sepa-mandate-pdf', { body });
  if (error) throw error;
  return data;
}

export async function invokeAIAssistant(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body });
  if (error) throw error;
  return data;
}

export async function ensureRentPayments(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ensure-rent-payments', { body });
  if (error) throw error;
  return data;
}

export async function createSEPAMandate(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('create-sepa-mandate', { body });
  if (error) throw error;
  return data;
}

export async function createSEPAMandateSession(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('create-sepa-mandate-session', { body });
  if (error) throw error;
  return data;
}

export async function checkMandateStatus(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('check-mandate-status', { body });
  if (error) throw error;
  return data;
}

export async function cancelSEPAMandate(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('cancel-sepa-mandate', { body });
  if (error) throw error;
  return data;
}

export const identityService = {
  initiateKiltKYC,
  initiateDiditKYC,
  initiateOpenAPIKYC,
  checkDiditKYCStatus,
  createSEPAMandate,
  createSEPAMandateSession,
  generateSEPAMandatePDF,
  invokeAIAssistant,
  ensureRentPayments,
  checkMandateStatus,
  cancelSEPAMandate,
};
