/**
 * Signature Provider Registry
 * 
 * This file defines the interface and registry for country-specific qualified signature providers.
 * To add a new provider, implement the SignatureProviderConfig interface and add it to SIGNATURE_PROVIDERS.
 */

export interface SignatureProviderConfig {
  code: string;
  name: string;
  countries: string[];
  protocolScheme: string;
  
  /**
   * Generate the protocol URL to invoke the native signature application
   */
  getProtocolUrl: (params: {
    documentBase64: string;
    sessionId: string;
    callbackUrl: string;
  }) => string;
  
  /**
   * Validate and parse the callback data from the signature application
   */
  validateCallback: (payload: any) => {
    isValid: boolean;
    signedDocument?: string;
    certificateInfo?: any;
    errorCode?: string;
    errorMessage?: string;
  };
}

/**
 * AutoFirma Provider (Spain)
 * Protocol: https://github.com/ctt-gob-es/clienteafirma
 */
const AutoFirmaProvider: SignatureProviderConfig = {
  code: 'autofirma',
  name: 'AutoFirma',
  countries: ['ES'],
  protocolScheme: 'autofirma://',
  
  getProtocolUrl: ({ documentBase64, sessionId, callbackUrl }) => {
    const params = new URLSearchParams({
      dat: documentBase64,
      algorithm: 'SHA256withRSA',
      format: 'PAdES',
      sessionid: sessionId,
      rtservlet: callbackUrl,
    });
    return `autofirma://sign?${params.toString()}`;
  },
  
  validateCallback: (payload) => {
    const { sessionId, signedDocument, certificateInfo, errorCode } = payload;
    
    if (!sessionId) {
      return { isValid: false, errorMessage: 'Missing session ID' };
    }
    
    if (errorCode) {
      return { 
        isValid: false, 
        errorCode, 
        errorMessage: `AutoFirma error: ${errorCode}` 
      };
    }
    
    if (!signedDocument) {
      return { isValid: false, errorMessage: 'Missing signed document' };
    }
    
    return {
      isValid: true,
      signedDocument,
      certificateInfo: certificateInfo || {},
    };
  },
};

/**
 * OpenAPI.com Provider (EU-wide)
 * Protocol: REST API with OTP verification
 * Docs: https://console.openapi.com/apis/esignature/documentation
 */
const OpenAPIProvider: SignatureProviderConfig = {
  code: 'openapi',
  name: 'OpenAPI.com QES',
  countries: ['ES', 'IT', 'PT', 'FR', 'DE', 'NL', 'BE', 'AT', 'PL', 'GR'],
  protocolScheme: 'https://',
  
  getProtocolUrl: ({ documentBase64, sessionId, callbackUrl }) => {
    // OpenAPI uses REST API, not protocol URL
    // Return a placeholder - actual signing happens via API calls
    return `https://console.openapi.com/signatures/${sessionId}`;
  },
  
  validateCallback: (payload) => {
    const { sessionId, signatureId, state, signedDocument, certificateInfo } = payload;
    
    if (!sessionId) {
      return { isValid: false, errorMessage: 'Missing session ID' };
    }
    
    if (state === 'ERROR' || state === 'FAILED') {
      return { 
        isValid: false, 
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage || 'Signature failed'
      };
    }
    
    if (state !== 'DONE') {
      return { 
        isValid: false, 
        errorMessage: `Invalid state: ${state}` 
      };
    }
    
    if (!signedDocument) {
      return { isValid: false, errorMessage: 'Missing signed document' };
    }
    
    return {
      isValid: true,
      signedDocument,
      certificateInfo: certificateInfo || {},
    };
  },
};

/**
 * Registry of all available signature providers
 * Add new providers here as they are implemented
 */
export const SIGNATURE_PROVIDERS: Record<string, SignatureProviderConfig> = {
  autofirma: AutoFirmaProvider,
  openapi: OpenAPIProvider,
};

/**
 * Get provider by country
 */
export function getProviderByCountry(country: string): SignatureProviderConfig | null {
  const provider = Object.values(SIGNATURE_PROVIDERS).find(p => 
    p.countries.includes(country)
  );
  return provider || null;
}

/**
 * Get provider by code
 */
export function getProviderByCode(code: string): SignatureProviderConfig | null {
  return SIGNATURE_PROVIDERS[code] || null;
}
