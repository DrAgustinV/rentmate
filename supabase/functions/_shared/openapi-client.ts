/**
 * OpenAPI.com eSignature API Client
 * Docs: https://console.openapi.com/apis/esignature/documentation
 */

const OPENAPI_BASE_URL = 'https://esignature.openapi.com';
const OPENAPI_SANDBOX_URL = 'https://sandbox-esignature.openapi.com';

interface OpenAPIConfig {
  accessToken: string;
  certificateUsername: string;
  certificatePassword: string;
  useSandbox?: boolean;
}

interface CreateSignatureParams {
  documentBase64: string;
  documentName: string;
  signatureType?: 'pades' | 'cades' | 'xades';
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export class OpenAPIClient {
  private config: OpenAPIConfig;
  private baseUrl: string;
  
  constructor(config: OpenAPIConfig) {
    this.config = config;
    this.baseUrl = config.useSandbox ? OPENAPI_SANDBOX_URL : OPENAPI_BASE_URL;
  }
  
  /**
   * Create QES signature request with OTP
   */
  async createQESSignature(params: CreateSignatureParams) {
    const payload = {
      inputDocument: [{
        sourceType: 'base64',
        payload: params.documentBase64,
        filename: params.documentName,
      }],
      certificateUsername: this.config.certificateUsername,
      certificatePassword: this.config.certificatePassword,
      signatureType: params.signatureType || 'pades',
      title: `Contract Signature - ${params.documentName}`,
      description: 'Rental agreement signature',
      callbackUrl: params.callbackUrl,
      metadata: params.metadata,
    };
    
    console.log('Creating QES signature with OpenAPI');
    
    const response = await fetch(`${this.baseUrl}/EU-QES_otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('OpenAPI error:', response.status, error);
      throw new Error(`OpenAPI error: ${error.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Get signature status
   */
  async getSignatureStatus(signatureId: string) {
    const response = await fetch(
      `${this.baseUrl}/signatures/${signatureId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get signature status: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Download signed document
   */
  async downloadSignedDocument(signatureId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/signatures/${signatureId}/signedDocument`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to download signed document: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Send OTP to signer
   */
  async sendOTP(signatureId: string, deliveryMethod: 'sms' | 'email' | 'both') {
    console.log(`Sending OTP for signature ${signatureId} via ${deliveryMethod}`);
    
    const response = await fetch(
      `${this.baseUrl}/signatures/${signatureId}/otp/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deliveryMethod }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Failed to send OTP:', response.status, error);
      throw new Error(`Failed to send OTP: ${error.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Verify OTP and complete signature
   */
  async verifyOTP(signatureId: string, otpCode: string) {
    console.log(`Verifying OTP for signature ${signatureId}`);
    
    const response = await fetch(
      `${this.baseUrl}/signatures/${signatureId}/otp/verify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: otpCode }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('OTP verification failed:', response.status, error);
      throw new Error(error.message || 'Invalid OTP');
    }
    
    return await response.json();
  }
}

/**
 * Create OpenAPI client with environment credentials
 */
export function createOpenAPIClient(): OpenAPIClient {
  const accessToken = Deno.env.get('OPENAPI_ACCESS_TOKEN');
  const certUsername = Deno.env.get('OPENAPI_CERTIFICATE_USERNAME');
  const certPassword = Deno.env.get('OPENAPI_CERTIFICATE_PASSWORD');
  const useSandbox = Deno.env.get('OPENAPI_SANDBOX_MODE') === 'true';
  
  if (!accessToken || !certUsername || !certPassword) {
    throw new Error('Missing OpenAPI credentials in environment');
  }
  
  return new OpenAPIClient({
    accessToken,
    certificateUsername: certUsername,
    certificatePassword: certPassword,
    useSandbox,
  });
}
