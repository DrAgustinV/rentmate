import { ReactNode, useEffect } from "react";
import { useBrandSettings } from "@/hooks/useBrandSettings";

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const { settings, loading } = useBrandSettings();

  useEffect(() => {
    if (settings) {
      // Apply colors to CSS variables
      const root = document.documentElement;
      root.style.setProperty("--primary", settings.primary_color);
      root.style.setProperty("--accent", settings.accent_color);
      
      // Update gradient that uses primary and accent
      const gradient = `linear-gradient(135deg, hsl(${settings.primary_color}), hsl(${settings.accent_color}))`;
      root.style.setProperty("--gradient-primary", gradient);
      
      // Update ring color to match primary
      root.style.setProperty("--ring", settings.primary_color);
      root.style.setProperty("--sidebar-primary", settings.primary_color);
      root.style.setProperty("--sidebar-ring", settings.primary_color);
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

  return <>{children}</>;
}
