import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import { BRAND_CONFIG } from '@/config/brand.config';

interface BrandContextType {
  brandName: string;
  logoUrl: string;
  logoAlt: string;
  tagline: string;
  email: string;
  loading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandContextProvider({ children }: { children: ReactNode }) {
  const { settings, loading } = useBrandSettings();

  const value = useMemo<BrandContextType>(() => ({
    brandName: settings?.brand_name || BRAND_CONFIG.name,
    logoUrl: settings?.logo_url || BRAND_CONFIG.logo.src,
    logoAlt: `${settings?.brand_name || BRAND_CONFIG.name} Logo`,
    tagline: BRAND_CONFIG.tagline,
    email: BRAND_CONFIG.contact.email,
    loading,
  }), [settings, loading]);

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within BrandContextProvider');
  }
  return context;
}
