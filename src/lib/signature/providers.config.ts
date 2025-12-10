/**
 * Frontend UI Configuration for Signature Providers
 * 
 * ⚠️ CRITICAL: Never use vendor names in UI-visible strings!
 * Use ONLY generic terms: "Digital Signature", "Manual / Paper", "Skip"
 * Vendor names (YouSign, DocuSeal, Didit, etc.) stay in backend code only.
 * Legal pages (Privacy, Cookie Policy, DPA) are the ONLY exception.
 */

import { Shield, FileSignature } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SignatureProviderUIConfig {
  code: string;
  name: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  installationGuideUrl: string;
  
  /**
   * Render custom installation instructions
   */
  renderInstructions?: () => React.ReactNode;
  
  /**
   * Check if provider is installed (browser detection)
   */
  checkInstallation?: () => Promise<boolean>;
}

/**
 * AutoFirma UI Configuration (Spain)
 */
const AutoFirmaUI: SignatureProviderUIConfig = {
  code: 'autofirma',
  name: 'AutoFirma',
  displayName: 'AutoFirma (Qualified Signature)',
  description: 'Spanish legally-recognized qualified digital signature',
  icon: Shield,
  installationGuideUrl: 'https://firmaelectronica.gob.es/Home/Descargas.html',
  
  checkInstallation: async () => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 2000);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'autofirma://version';
      
      iframe.onload = () => {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(true);
      };
      
      iframe.onerror = () => {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(false);
      };
      
      document.body.appendChild(iframe);
    });
  },
};

/**
 * OpenAPI UI Configuration (Multiple EU Countries)
 */
const OpenAPIUI: SignatureProviderUIConfig = {
  code: 'openapi',
  name: 'OpenAPI',
  displayName: 'OpenAPI QES (EU)',
  description: 'Web-based qualified electronic signature for 10 EU countries',
  icon: FileSignature,
  installationGuideUrl: 'https://openapi.com/',
  
  checkInstallation: async () => {
    // Web-based, always available
    return true;
  },
};

/**
 * YouSign UI Configuration (EU-wide)
 */
const YouSignUI: SignatureProviderUIConfig = {
  code: 'yousign',
  name: 'Digital Signature',
  displayName: 'Digital Signature',
  description: 'Legally binding electronic signature',
  icon: FileSignature,
  installationGuideUrl: 'https://yousign.com/',
  
  checkInstallation: async () => {
    // Web-based, always available
    return true;
  },
};

/**
 * Registry of provider UI configurations
 */
export const SIGNATURE_PROVIDER_UI: Record<string, SignatureProviderUIConfig> = {
  autofirma: AutoFirmaUI,
  openapi: OpenAPIUI,
  yousign: YouSignUI,
};

/**
 * Get UI config for provider
 */
export function getProviderUI(code: string): SignatureProviderUIConfig | null {
  return SIGNATURE_PROVIDER_UI[code] || null;
}
