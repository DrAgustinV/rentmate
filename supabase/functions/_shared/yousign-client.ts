/**
 * YouSign API Client
 * Docs: https://developers.yousign.com/
 */

const YOUSIGN_SANDBOX_URL = 'https://api-sandbox.yousign.app/v3';
const YOUSIGN_PRODUCTION_URL = 'https://api.yousign.app/v3';

export interface YouSignSignerInput {
  info: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    locale?: string;
  };
  signature_level: 'electronic_signature' | 'advanced_electronic_signature' | 'electronic_signature_with_qualified_certificate';
  signature_authentication_mode?: 'otp_email' | 'otp_sms' | 'no_otp';
  fields?: Array<{
    type: 'signature' | 'mention_read_and_approved' | 'text' | 'checkbox';
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>;
}

export interface YouSignSignatureRequest {
  id: string;
  status: 'draft' | 'ongoing' | 'done' | 'rejected' | 'expired' | 'deleted';
  name: string;
  delivery_mode: 'email' | 'none';
  created_at: string;
  expires_at: string;
  signers: YouSignSigner[];
  documents: YouSignDocument[];
  external_id?: string;
}

export interface YouSignSigner {
  id: string;
  status: 'initiated' | 'notified' | 'verified' | 'signed' | 'rejected' | 'error';
  info: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
  signature_link?: string;
  signature_link_expiration_date?: string;
}

export interface YouSignDocument {
  id: string;
  filename: string;
  nature: 'signable_document' | 'attachment';
  content_type: string;
}

export interface YouSignWebhookEvent {
  id: string;
  sandbox: boolean;
  event_name: string;
  event_time: string;
  data: {
    signature_request: YouSignSignatureRequest;
    signer?: YouSignSigner;
    document?: YouSignDocument;
  };
}

export class YouSignClient {
  private apiKey: string;
  private baseUrl: string;
  private sandbox: boolean;

  constructor() {
    this.apiKey = Deno.env.get('YOUSIGN_API_KEY') || '';
    this.sandbox = Deno.env.get('YOUSIGN_SANDBOX_MODE') === 'true';
    this.baseUrl = this.sandbox ? YOUSIGN_SANDBOX_URL : YOUSIGN_PRODUCTION_URL;

    if (!this.apiKey) {
      throw new Error('YOUSIGN_API_KEY is not configured');
    }

    console.log(`YouSign client initialized in ${this.sandbox ? 'sandbox' : 'production'} mode`);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    contentType: string = 'application/json'
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (contentType !== 'multipart/form-data') {
      headers['Content-Type'] = contentType;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      if (contentType === 'application/json') {
        options.body = JSON.stringify(body);
      } else {
        options.body = body;
      }
    }

    console.log(`YouSign API ${method} ${endpoint}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`YouSign API error: ${response.status} ${errorText}`);
      throw new Error(`YouSign API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a new signature request
   */
  async createSignatureRequest(params: {
    name: string;
    delivery_mode?: 'email' | 'none';
    external_id?: string;
    timezone?: string;
    expiration_date?: string;
  }): Promise<YouSignSignatureRequest> {
    return this.request<YouSignSignatureRequest>('POST', '/signature_requests', {
      name: params.name,
      delivery_mode: params.delivery_mode || 'email',
      external_id: params.external_id,
      timezone: params.timezone || 'Europe/Madrid',
      expiration_date: params.expiration_date,
    });
  }

  /**
   * Upload a document to a signature request
   */
  async uploadDocument(
    signatureRequestId: string,
    fileContent: ArrayBuffer,
    filename: string,
    nature: 'signable_document' | 'attachment' = 'signable_document'
  ): Promise<YouSignDocument> {
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'application/pdf' });
    formData.append('file', blob, filename);
    formData.append('nature', nature);

    const url = `${this.baseUrl}/signature_requests/${signatureRequestId}/documents`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouSign document upload error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Add a signer to a signature request
   */
  async addSigner(
    signatureRequestId: string,
    documentId: string,
    signer: YouSignSignerInput
  ): Promise<YouSignSigner> {
    const signerBody = {
      info: signer.info,
      signature_level: signer.signature_level,
      signature_authentication_mode: signer.signature_authentication_mode || 'otp_email',
      fields: signer.fields?.map(field => ({
        document_id: documentId,
        type: field.type,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      })) || [
        // Default signature field at bottom of first page
        {
          document_id: documentId,
          type: 'signature',
          page: 1,
          x: 100,
          y: 700,
          width: 180,
          height: 60,
        },
      ],
    };

    return this.request<YouSignSigner>(
      'POST',
      `/signature_requests/${signatureRequestId}/signers`,
      signerBody
    );
  }

  /**
   * Activate a signature request (start the signing process)
   */
  async activateSignatureRequest(signatureRequestId: string): Promise<YouSignSignatureRequest> {
    return this.request<YouSignSignatureRequest>(
      'POST',
      `/signature_requests/${signatureRequestId}/activate`,
      {}
    );
  }

  /**
   * Get signature request details
   */
  async getSignatureRequest(signatureRequestId: string): Promise<YouSignSignatureRequest> {
    return this.request<YouSignSignatureRequest>('GET', `/signature_requests/${signatureRequestId}`);
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(signatureRequestId: string, documentId: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/signature_requests/${signatureRequestId}/documents/${documentId}/download`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouSign download error: ${response.status} - ${errorText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Cancel a signature request
   */
  async cancelSignatureRequest(signatureRequestId: string, reason?: string): Promise<void> {
    await this.request<void>('POST', `/signature_requests/${signatureRequestId}/cancel`, {
      reason: reason || 'Cancelled by user',
    });
  }

  /**
   * Verify webhook signature
   */
  static async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      // YouSign uses HMAC-SHA256 for webhook signatures
      // The signature header includes a 'sha256=' prefix that must be stripped
      const cleanSignature = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;
      
      const encoder = new TextEncoder();
      const key = encoder.encode(secret);
      const data = encoder.encode(payload);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return computedSignature === cleanSignature;
    } catch {
      return false;
    }
  }
}

export function createYouSignClient(): YouSignClient {
  return new YouSignClient();
}
