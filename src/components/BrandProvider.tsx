import { ReactNode, useEffect } from "react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { BrandContextProvider } from "@/contexts/BrandContext";

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const { settings } = useBrandSettings();

  useEffect(() => {
    if (settings) {
      try {
        // Apply colors to CSS variables
        const root = document.documentElement;
        root.style.setProperty("--primary", settings.primary_color);
        root.style.setProperty("--accent", settings.accent_color);
        root.style.setProperty("--header-background", settings.header_background_color);
        root.style.setProperty("--header-background-opacity", String(settings.header_background_opacity / 100));
        
        // Derive --primary-hover from --primary (reduce lightness by 5%)
        const primaryParts = settings.primary_color.split(" ");
        if (primaryParts.length >= 3) {
          const h = primaryParts[0];
          const s = primaryParts[1];
          const lValue = parseFloat(primaryParts[2].replace("%", ""));
          const hoverL = Math.max(0, lValue - 5);
          root.style.setProperty("--primary-hover", `${h} ${s} ${hoverL}%`);
        }
        
        // Update gradient that uses primary and accent
        const gradient = `linear-gradient(135deg, hsl(${settings.primary_color}), hsl(${settings.accent_color}))`;
        root.style.setProperty("--gradient-primary", gradient);
        
        // Update ring color to match primary
        root.style.setProperty("--ring", settings.primary_color);
        root.style.setProperty("--sidebar-primary", settings.primary_color);
        root.style.setProperty("--sidebar-ring", settings.primary_color);

        // Update document title with brand name
        document.title = `${settings.brand_name} - Property Management Made Simple`;
      } catch (error) {
        console.error("[BrandProvider] Error applying brand settings:", error);
      }
    }
  }, [settings]);

  // Never block render - apply settings in background
  return (
    <BrandContextProvider>
      {children}
    </BrandContextProvider>
  );
}
