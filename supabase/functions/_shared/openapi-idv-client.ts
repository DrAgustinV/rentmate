/**
 * OpenAPI Identity Verification (IDV) Client
 * Handles AI-powered identity verification with different levels:
 * - basic: ID document scan (~3 mins, AI verified)
 * - advanced: ID scan + face capture (~3 mins, AI verified)
 * - expert: ID scan + face + human expert review (~3 hours)
 */

interface OpenAPIIDVConfig {
  accessToken: string;
  useSandbox: boolean;
}

export type VerificationLevel = 'basic' | 'advanced' | 'expert';

interface InitiateVerificationParams {
  level: VerificationLevel;
  callbackUrl: string;
  metadata?: {
    userId: string;
    email: string;
  };
}

interface VerificationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  qrCodeUrl: string;
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
   * Returns QR code URL for mobile scanning
   */
  async initiateVerification(params: InitiateVerificationParams): Promise<VerificationResponse> {
    const endpoint = this.getEndpointForLevel(params.level);
    
    const payload = {
      callbackUrl: params.callbackUrl,
      metadata: params.metadata,
    };

    console.log(`🔍 Initiating ${params.level} IDV verification`);
    
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
      console.error('❌ OpenAPI IDV initiation failed:', errorText);
      throw new Error(`Failed to initiate verification: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ IDV verification initiated:', data.id);
    
    return data;
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

    return await response.json();
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
        return '/idv-flash-advanced'; // Same endpoint, but expert review is enabled
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
