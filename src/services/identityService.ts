import { supabase } from '@/integrations/supabase/client';
import type {
  KYCKiltResponse,
  KYCDiditResponse,
  // KYCOpenAPIResponse — BLOCKED: OpenAPI KYC is disabled
  DIDITStatusResponse,
  SEPAMandatePDFResponse,
  AIAssistantResponse,
  EnsureRentPaymentsResponse,
  SEPAMandateResponse,
  SEPAMandateSessionResponse,
  MandateStatusResponse,
  CancelMandateResponse,
  EmailVerificationResponse,
  VerifyEmailTokenResponse,
  VerifyOTPResponse,
  QualifiedSignatureResponse,
  PasswordResetResponse,
} from '@/types/edge-functions';

export async function initiateKiltKYC(): Promise<KYCKiltResponse> {
  const { data, error } = await supabase.functions.invoke('initiate-kilt-kyc');
  if (error) throw error;
  return data as KYCKiltResponse;
}

export async function initiateDiditKYC(): Promise<KYCDiditResponse> {
  const { data, error } = await supabase.functions.invoke('initiate-didit-kyc');
  if (error) throw error;
  return data as KYCDiditResponse;
}

// BLOCKED: OpenAPI KYC is disabled — kept as reference
// export async function initiateOpenAPIKYC(level?: string): Promise<KYCOpenAPIResponse> {
//   const { data, error } = await supabase.functions.invoke('initiate-openapi-kyc', {
//     body: { level: level || 'basic' },
//   });
//   if (error) throw error;
//   return data as KYCOpenAPIResponse;
// }

export async function checkDiditKYCStatus(): Promise<DIDITStatusResponse> {
  const { data, error } = await supabase.functions.invoke('check-didit-kyc-status');
  if (error) throw error;
  return data as DIDITStatusResponse;
}

export async function generateSEPAMandatePDF(body: Record<string, unknown>): Promise<SEPAMandatePDFResponse> {
  const { data, error } = await supabase.functions.invoke('generate-sepa-mandate-pdf', { body });
  if (error) throw error;
  return data as SEPAMandatePDFResponse;
}

export async function invokeAIAssistant(body: Record<string, unknown>): Promise<AIAssistantResponse> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body });
  if (error) throw error;
  return data as AIAssistantResponse;
}

export async function ensureRentPayments(body: Record<string, unknown>): Promise<EnsureRentPaymentsResponse> {
  const { data, error } = await supabase.functions.invoke('ensure-rent-payments', { body });
  if (error) throw error;
  return data as EnsureRentPaymentsResponse;
}

export async function createSEPAMandate(body: Record<string, unknown>): Promise<SEPAMandateResponse> {
  const { data, error } = await supabase.functions.invoke('create-sepa-mandate', { body });
  if (error) throw error;
  return data as SEPAMandateResponse;
}

export async function createSEPAMandateSession(body: Record<string, unknown>): Promise<SEPAMandateSessionResponse> {
  const { data, error } = await supabase.functions.invoke('create-sepa-mandate-session', { body });
  if (error) throw error;
  return data as SEPAMandateSessionResponse;
}

export async function checkMandateStatus(body: Record<string, unknown>): Promise<MandateStatusResponse> {
  const { data, error } = await supabase.functions.invoke('check-mandate-status', { body });
  if (error) throw error;
  return data as MandateStatusResponse;
}

export async function cancelSEPAMandate(body: Record<string, unknown>): Promise<CancelMandateResponse> {
  const { data, error } = await supabase.functions.invoke('cancel-sepa-mandate', { body });
  if (error) throw error;
  return data as CancelMandateResponse;
}

export async function sendEmailVerification(): Promise<EmailVerificationResponse> {
  const { data, error } = await supabase.functions.invoke('send-email-verification');
  if (error) throw error;
  return data as EmailVerificationResponse;
}

export async function verifyEmailToken(body: Record<string, unknown>): Promise<VerifyEmailTokenResponse> {
  const { data, error } = await supabase.functions.invoke('verify-email-token', { body });
  if (error) throw error;
  return data as VerifyEmailTokenResponse;
}

export async function verifyOpenAPIOTP(body: Record<string, unknown>): Promise<VerifyOTPResponse> {
  const { data, error } = await supabase.functions.invoke('verify-openapi-otp', { body });
  if (error) throw error;
  return data as VerifyOTPResponse;
}

export async function initiateQualifiedSignature(body: Record<string, unknown>): Promise<QualifiedSignatureResponse> {
  const { data, error } = await supabase.functions.invoke('initiate-qualified-signature', { body });
  if (error) throw error;
  return data as QualifiedSignatureResponse;
}

export async function sendPasswordResetEmail(body: Record<string, unknown>): Promise<PasswordResetResponse> {
  const { data, error } = await supabase.functions.invoke('send-password-reset-email', { body });
  if (error) throw error;
  return data as PasswordResetResponse;
}

export const identityService = {
  initiateKiltKYC,
  initiateDiditKYC,
  // initiateOpenAPIKYC — BLOCKED
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