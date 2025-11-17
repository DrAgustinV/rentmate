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
  countries: ['Spain'],
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
 * Registry of all available signature providers
 * Add new providers here as they are implemented
 */
export const SIGNATURE_PROVIDERS: Record<string, SignatureProviderConfig> = {
  autofirma: AutoFirmaProvider,
  // Add more providers here:
  // cartaocidadao: CartaoCidadaoProvider,
  // etc.
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
