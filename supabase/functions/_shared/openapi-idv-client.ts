/**
 * BLOCKED: OpenAPI KYC is disabled.
 * This client is preserved for reference but NOT used at runtime.
 * The initiate-openapi-kyc edge function now returns a 410 Gone response.
 * 
 * To re-enable:
 * 1. Uncomment config.toml [functions.initiate-openapi-kyc] entry
 * 2. Restore initiate-openapi-kyc/index.ts body
 * 3. Create verify-openapi-kyc webhook edge function
 * 4. Unblock 'openapi' in src/types/enums.ts KYCProvider type
 * 5. Unblock openapi_* variants in kyc.schema.ts KYCProviderEnum
 * 6. Restore and wire OpenAPI option in IdentityVerification.tsx UI
 * 7. Re-add initiateOpenAPIKYC to identityService.ts
 */

/**
 * OpenAPI Identity Verification (IDV) Client
 * Handles AI-powered identity verification with different levels:
 * - basic: ID document scan (~3 mins, AI verified)
 * - advanced: ID scan + face capture (~3 mins, AI verified)
 * - expert: ID scan + face + human expert review (~3 hours)
 * 
 * API Docs: https://console.openapi.com/apis/trust/documentation
 */

interface OpenAPIIDVConfig {
  accessToken: string;
  useSandbox: boolean;
}

export type VerificationLevel = 'basic' | 'advanced' | 'expert';

interface InitiateVerificationParams {
  level: VerificationLevel;
  callbackUrl: string;
  redirectUrl?: string;
  userData: {
    userId: string;
    email: string;
    name?: string;
  };
}

interface VerificationResponse {
  id: string;
  status: 'pending' | 'pending_redirection' | 'processing' | 'completed' | 'failed';
  qrCodeUrl?: string;
  verificationUrl: string;
  createdAt: string;
  completedAt?: string;
  result?: {
    verified: boolean;
    documentType?: string;
    documentNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    faceMatch?: boolean;
    confidence?: number;
  };
}

export class OpenAPIIDVClient {
  private baseUrl: string;
  private config: OpenAPIIDVConfig;

  constructor(config: OpenAPIIDVConfig) {
    this.config = config;
    
    // Read Trust URLs from environment with defaults
    const productionUrl = Deno.env.get('OPENAPI_TRUST_PRODUCTION_URL') || 'https://trust.openapi.com';
    const sandboxUrl = Deno.env.get('OPENAPI_TRUST_SANDBOX_URL') || 'https://test.trust.openapi.com';
    
    this.baseUrl = config.useSandbox ? sandboxUrl : productionUrl;
    console.log(`🔧 OpenAPI Trust IDV using: ${this.baseUrl}`);
  }

  /**
   * Initiate identity verification request
   * Returns verification URL for user redirect
   * 
   * Payload structure per OpenAPI Trust API spec:
   * {
   *   email: "user@example.com",
   *   name: "User Name",
   *   redirectUrl: "https://app.com/callback",
   *   callback: {
   *     url: "https://api.example.com/webhook",
   *     custom: { userId: "..." }
   *   }
   * }
   */
  async initiateVerification(params: InitiateVerificationParams): Promise<VerificationResponse> {
    const endpoint = this.getEndpointForLevel(params.level);
    
    // Structure payload per OpenAPI Trust API specification
    const payload: Record<string, unknown> = {
      email: params.userData.email,
      callback: {
        url: params.callbackUrl,
        custom: {
          userId: params.userData.userId,
        },
      },
    };

    // Add optional fields only if provided
    if (params.userData.name) {
      payload.name = params.userData.name;
    }
    if (params.redirectUrl) {
      payload.redirectUrl = params.redirectUrl;
    }

    console.log(`🔍 Initiating ${params.level} IDV verification for ${params.userData.email}`);
    console.log('📤 Request payload:', JSON.stringify(payload, null, 2));
    console.log(`📡 Endpoint: POST ${this.baseUrl}${endpoint}`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAPI IDV initiation failed:', response.status, errorText);
      throw new Error(`Failed to initiate verification: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ IDV verification initiated:', JSON.stringify(data, null, 2));
    
    // Map API response to our interface
    // API returns: { id, verificationUrl, status: "pending_redirection", ... }
    return {
      id: data.id,
      status: data.status === 'pending_redirection' ? 'pending' : data.status,
      qrCodeUrl: data.verificationUrl, // Map for backward compatibility with QR code display
      verificationUrl: data.verificationUrl,
      createdAt: data.createdAt,
    };
  }

  /**
   * Get verification status by ID
   * Used for manual polling or callback validation
   */
  async getVerificationStatus(verificationId: string, level: VerificationLevel): Promise<VerificationResponse> {
    const endpoint = this.getEndpointForLevel(level);
    
    console.log(`📊 Fetching status for verification ${verificationId}`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}/${verificationId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get verification status:', errorText);
      throw new Error(`Failed to get status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map response consistently
    return {
      id: data.id,
      status: data.status === 'pending_redirection' ? 'pending' : data.status,
      qrCodeUrl: data.verificationUrl,
      verificationUrl: data.verificationUrl,
      createdAt: data.createdAt,
      completedAt: data.updatedAt,
      result: data.documents?.length > 0 ? {
        verified: data.state === 'VALID',
        documentType: data.documents[0]?.type,
        documentNumber: data.documents[0]?.number,
        fullName: data.name,
      } : undefined,
    };
  }

  /**
   * Initiate email verification
   * Separate optional step to verify email ownership
   */
  async initiateEmailVerification(email: string): Promise<{ id: string; status: string }> {
    console.log(`📧 Initiating email verification for ${email}`);
    
    const response = await fetch(`${this.baseUrl}/email-start/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Email verification failed:', errorText);
      throw new Error(`Failed to verify email: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Map verification level to API endpoint
   */
  private getEndpointForLevel(level: VerificationLevel): string {
    switch (level) {
      case 'basic':
        return '/idv-flash-start';
      case 'advanced':
        return '/idv-flash-advanced';
      case 'expert':
        return '/idv-expert'; // Correct endpoint for expert level
      default:
        throw new Error(`Unknown verification level: ${level}`);
    }
  }
}

/**
 * Factory function to create OpenAPI IDV client
 * Uses environment variables for configuration
 */
export function createOpenAPIIDVClient(): OpenAPIIDVClient {
  const accessToken = Deno.env.get('OPENAPI_ACCESS_TOKEN');
  const useSandbox = Deno.env.get('OPENAPI_SANDBOX_MODE') === 'true';

  if (!accessToken) {
    throw new Error('OPENAPI_ACCESS_TOKEN environment variable is not set');
  }

  return new OpenAPIIDVClient({
    accessToken,
    useSandbox,
  });
}
