export interface KYCKiltResponse {
  sessionId: string;
  sessionUri: string;
}

export interface KYCDiditResponse {
  sessionId: string;
  sessionUrl: string;
}

export interface KYCOpenAPIResponse {
  sessionId: string;
  redirectUrl: string;
}

export interface DIDITStatusResponse {
  status: 'pending' | 'approved' | 'declined' | 'expired';
  decision?: {
    status: string;
    createdAt: string;
  };
  documents?: Array<{
    type: string;
    status: string;
  }>;
}

export interface SEPAMandatePDFResponse {
  documentUrl: string;
  mandateId: string;
}

export interface AIAssistantResponse {
  message: string;
  suggestions?: string[];
}

export interface EnsureRentPaymentsResponse {
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
}

export interface SEPAMandateResponse {
  mandateId: string;
  mandateUrl: string;
  status: 'pending' | 'pending_signature' | 'active' | 'failed';
}

export interface SEPAMandateSessionResponse {
  sessionId: string;
  sessionUrl: string;
  expiresAt: string;
}

export interface MandateStatusResponse {
  status: 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';
  mandateId?: string;
  signatureDate?: string;
}

export interface CancelMandateResponse {
  success: boolean;
  mandateId: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  email: string;
}

export interface VerifyEmailTokenResponse {
  success: boolean;
  userId: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  sessionToken?: string;
}

export interface QualifiedSignatureResponse {
  signatureId: string;
  envelopeId: string;
  signingUrl: string;
}

export interface PasswordResetResponse {
  success: boolean;
  email: string;
}

export type EdgeFunctionError = {
  message: string;
  status?: number;
};