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

export async function sendEmailVerification(): Promise<any> {
  const { data, error } = await supabase.functions.invoke('send-email-verification');
  if (error) throw error;
  return data;
}

export async function verifyEmailToken(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('verify-email-token', { body });
  if (error) throw error;
  return data;
}

export async function verifyOpenAPIOTP(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('verify-openapi-otp', { body });
  if (error) throw error;
  return data;
}

export async function initiateQualifiedSignature(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('initiate-qualified-signature', { body });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('send-password-reset-email', { body });
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
  sendEmailVerification,
  verifyEmailToken,
  verifyOpenAPIOTP,
  initiateQualifiedSignature,
  sendPasswordResetEmail,
  checkMandateStatus,
  cancelSEPAMandate,
};
