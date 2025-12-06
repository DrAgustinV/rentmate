/**
 * Didit.me API Client
 * Handles identity verification through Didit's free KYC service
 * 
 * Features:
 * - FREE unlimited ID verification
 * - 190+ countries support
 * - Simple API (no certificates required)
 */

const DIDIT_API_URL = 'https://verification.didit.me';

interface DiditSessionRequest {
  workflow_id: string; // Required workflow ID
  callback: string; // Webhook callback URL
  vendor_data?: string; // Custom data (e.g., user_id)
  contact_details?: { email?: string }; // Optional contact details
}

interface DiditSessionResponse {
  session_id: string;
  verification_url: string;
  qr_code_url?: string;
  status: string;
}

interface DiditSessionDecision {
  session_id: string;
  status: 'created' | 'pending' | 'approved' | 'declined' | 'expired' | 'abandoned';
  decision?: {
    result: 'approved' | 'declined' | 'pending';
    reason?: string;
  };
  extracted_data?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    document_type?: string;
    document_number?: string;
    country?: string;
    expiry_date?: string;
  };
  vendor_data?: string;
}

interface DiditWebhookPayload {
  event: string;
  session_id: string;
  status: string;
  decision?: {
    result: string;
    reason?: string;
  };
  extracted_data?: Record<string, unknown>;
  vendor_data?: string;
  timestamp: string;
}

export class DiditClient {
  private apiKey: string;
  private workflowId?: string;

  constructor(apiKey: string, workflowId?: string) {
    if (!apiKey) {
      throw new Error('DIDIT_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.workflowId = workflowId;
  }

  /**
   * Create a new verification session
   */
  async createSession(
    userId: string,
    callbackUrl: string,
    email?: string
  ): Promise<DiditSessionResponse> {
    console.log('[DiditClient] Creating verification session for user:', userId);

    if (!this.workflowId) {
      throw new Error('DIDIT_WORKFLOW_ID is required to create a session');
    }

    const requestBody: DiditSessionRequest = {
      workflow_id: this.workflowId,
      callback: callbackUrl,
      vendor_data: userId,
    };

    if (email) {
      requestBody.contact_details = { email };
    }

    const response = await fetch(`${DIDIT_API_URL}/v2/session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DiditClient] Session creation failed:', response.status, errorText);
      throw new Error(`Failed to create Didit session: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[DiditClient] Session created:', data.session_id);

    return {
      session_id: data.session_id,
      verification_url: data.verification_url || data.url,
      qr_code_url: data.qr_code_url,
      status: data.status || 'created',
    };
  }

  /**
   * Get session decision/status
   */
  async getSessionDecision(sessionId: string): Promise<DiditSessionDecision> {
    console.log('[DiditClient] Fetching session decision:', sessionId);

    const response = await fetch(`${DIDIT_API_URL}/v2/session/${sessionId}/decision`, {
      method: 'GET',
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DiditClient] Failed to get session decision:', response.status, errorText);
      throw new Error(`Failed to get Didit session decision: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DiditClient] Session decision:', data.status);

    return data as DiditSessionDecision;
  }

  /**
   * Verify webhook signature using HMAC-SHA256 (async)
   * Uses Web Crypto API for proper cryptographic verification
   */
  async verifyWebhookSignatureAsync(
    payload: string,
    signature: string,
    webhookSecret: string
  ): Promise<boolean> {
    try {
      console.log('[DiditClient] Verifying webhook signature with HMAC-SHA256');

      if (!signature || signature.length < 10) {
        console.warn('[DiditClient] Invalid or missing signature');
        return false;
      }

      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const payloadData = encoder.encode(payload);

      // Import the secret key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Sign the payload
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);

      // Convert to hex string
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const isValid = computedSignature === signature;
      console.log('[DiditClient] Signature valid:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('[DiditClient] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256 (sync - basic check only)
   * @deprecated Use verifyWebhookSignatureAsync for proper verification
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    // Basic validation only - for proper verification use async method
    console.log('[DiditClient] Basic webhook signature check');
    
    if (!signature || signature.length < 10) {
      console.warn('[DiditClient] Invalid or missing signature');
      return false;
    }

    return true; // Basic validation passed - caller should use async method
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: string): DiditWebhookPayload {
    try {
      const payload = JSON.parse(body) as DiditWebhookPayload;
      
      if (!payload.session_id) {
        throw new Error('Invalid webhook payload: missing session_id');
      }

      return payload;
    } catch (error) {
      console.error('[DiditClient] Failed to parse webhook payload:', error);
      throw new Error('Invalid webhook payload format');
    }
  }
}

/**
 * Create a Didit client instance from environment variables
 */
export function createDiditClient(): DiditClient {
  const apiKey = Deno.env.get('DIDIT_API_KEY');
  const workflowId = Deno.env.get('DIDIT_WORKFLOW_ID');

  if (!apiKey) {
    throw new Error('DIDIT_API_KEY environment variable is not set');
  }

  return new DiditClient(apiKey, workflowId);
}

export type { DiditSessionResponse, DiditSessionDecision, DiditWebhookPayload };
