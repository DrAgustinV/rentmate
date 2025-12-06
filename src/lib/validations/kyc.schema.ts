import { z } from 'zod';

/**
 * KILT Protocol KYC Status Values
 * These match the database enum for kyc_status column
 */
export const KYCStatusEnum = z.enum([
  'not_started',
  'pending',
  'in_progress', 
  'verified',
  'rejected',
  'expired'
]);

export type KYCStatus = z.infer<typeof KYCStatusEnum>;

/**
 * KILT Credential ID Schema
 * Format: UUID or KILT-specific identifier
 */
export const KYCCredentialIdSchema = z.string()
  .min(10, 'Credential ID must be at least 10 characters')
  .max(200, 'Credential ID must be less than 200 characters');

/**
 * Sporran Wallet Deep Link Schema
 * Format: sporran://... or https://...
 */
export const KYCQRCodeUrlSchema = z.string()
  .url('Invalid QR code URL')
  .refine(
    (url) => url.startsWith('sporran://') || url.startsWith('https://'),
    'QR code URL must be a valid Sporran deep link or HTTPS URL'
  );

/**
 * KILT DID (Decentralized Identifier) Schema
 * Format: did:kilt:...
 */
export const KYCWalletDIDSchema = z.string()
  .regex(/^did:kilt:[a-zA-Z0-9]+$/, 'Invalid KILT DID format. Must start with "did:kilt:"')
  .min(20, 'KILT DID is too short')
  .max(200, 'KILT DID is too long');

/**
 * KYC Provider Types
 * Tracks which verification provider was used
 */
export const KYCProviderEnum = z.enum([
  'kilt',
  'openapi_basic',
  'openapi_advanced', 
  'openapi_expert',
  'didit'
]);

export type KYCProvider = z.infer<typeof KYCProviderEnum>;

/**
 * KYC Profile Data Schema
 * Matches the profiles table KYC columns
 */
// Flexible datetime validation that accepts both ISO 8601 and Postgres timestamp formats
const flexibleDatetime = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
).nullable();

export const KYCProfileSchema = z.object({
  kyc_status: KYCStatusEnum,
  kyc_provider: z.string().nullable(),
  kyc_credential_id: z.string().nullable(),
  kyc_qr_code_url: z.string().nullable(),
  kyc_wallet_did: z.string().nullable(),
  kyc_verified_at: flexibleDatetime,
  kyc_expires_at: flexibleDatetime,
});

export type KYCProfile = z.infer<typeof KYCProfileSchema>;

/**
 * KYC Initiation Request Schema
 * Used when calling initiate-kilt-kyc edge function
 */
export const KYCInitiationRequestSchema = z.object({
  // Future: could add additional fields like attestation type
});

export type KYCInitiationRequest = z.infer<typeof KYCInitiationRequestSchema>;

/**
 * KYC Initiation Response Schema
 * Response from initiate-kilt-kyc edge function
 */
export const KYCInitiationResponseSchema = z.object({
  success: z.boolean(),
  credential_id: z.string().optional(),
  qr_code_url: z.string().optional(),
  kyc_status: KYCStatusEnum.optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type KYCInitiationResponse = z.infer<typeof KYCInitiationResponseSchema>;

/**
 * KYC Webhook Event Schema
 * Used by verify-kilt-attestation edge function
 */
export const KYCWebhookEventSchema = z.object({
  event: z.enum(['attestation_created', 'attestation_revoked', 'attestation_updated']),
  credentialId: z.string(),
  claimerDid: z.string(),
  verified: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type KYCWebhookEvent = z.infer<typeof KYCWebhookEventSchema>;

/**
 * Validation helper functions
 */

export function isKYCVerified(status: KYCStatus | null | undefined): boolean {
  return status === 'verified';
}

export function isKYCPending(status: KYCStatus | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}

export function isKYCRejectedOrExpired(status: KYCStatus | null | undefined): boolean {
  return status === 'rejected' || status === 'expired';
}

export function canInitiateKYC(status: KYCStatus | null | undefined): boolean {
  return status === 'not_started' || status === 'rejected' || status === 'expired';
}

export function isKYCExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  
  const expiryDate = new Date(expiresAt);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
}

/**
 * Error message helpers
 */

export function getKYCStatusErrorMessage(status: KYCStatus): string {
  switch (status) {
    case 'rejected':
      return 'Your KYC verification was rejected. Please try again or contact support.';
    case 'expired':
      return 'Your KYC verification has expired. Please renew it to continue.';
    case 'not_started':
      return 'You have not started KYC verification yet.';
    default:
      return 'Unknown KYC status.';
  }
}
