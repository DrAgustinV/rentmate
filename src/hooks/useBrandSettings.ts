import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandSettings {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_background_color: string;
  header_background_opacity: number;
}

export function useBrandSettings() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrandSettings();

    // Subscribe to changes
    const subscription = supabase
      .channel("brand_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brand_settings",
        },
        () => {
          fetchBrandSettings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchBrandSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching brand settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}
