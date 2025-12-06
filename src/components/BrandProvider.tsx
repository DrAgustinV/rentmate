import { ReactNode, useEffect } from "react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { BrandContextProvider } from "@/contexts/BrandContext";

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const { settings, loading } = useBrandSettings();

  useEffect(() => {
    console.log("[BrandProvider] Settings loaded:", settings);
    
    if (settings) {
      try {
        // Apply colors to CSS variables
        const root = document.documentElement;
        root.style.setProperty("--primary", settings.primary_color);
        root.style.setProperty("--accent", settings.accent_color);
    root.style.setProperty("--header-background", settings.header_background_color);
    root.style.setProperty("--header-background-opacity", String(settings.header_background_opacity / 100));
        
        // Update gradient that uses primary and accent
        const gradient = `linear-gradient(135deg, hsl(${settings.primary_color}), hsl(${settings.accent_color}))`;
        root.style.setProperty("--gradient-primary", gradient);
        
        // Update ring color to match primary
        root.style.setProperty("--ring", settings.primary_color);
        root.style.setProperty("--sidebar-primary", settings.primary_color);
        root.style.setProperty("--sidebar-ring", settings.primary_color);

        // Update document title with brand name
        document.title = `${settings.brand_name} - Property Management Made Simple`;
        
        console.log("[BrandProvider] Brand applied:", settings.brand_name);
      } catch (error) {
        console.error("[BrandProvider] Error applying brand settings:", error);
      }
    }
  }, [settings]);

  // Show loading state while fetching brand settings
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrandContextProvider>
      {children}
    </BrandContextProvider>
  );
}
