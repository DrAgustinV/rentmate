import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface CarouselItem {
  image_url: string;
  title: Record<string, string>;
  description: Record<string, string>;
}

interface BrandSettings {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_background_color: string;
  header_background_opacity: number;
  carousel_items: CarouselItem[] | null;
}

function parseCarouselItems(data: Json | null): CarouselItem[] | null {
  if (!data || !Array.isArray(data)) return null;
  try {
    return data.map((item: any) => ({
      image_url: item.image_url || "",
      title: item.title || {},
      description: item.description || {},
    }));
  } catch {
    return null;
  }
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
      
      const parsedSettings: BrandSettings = {
        id: data.id,
        brand_name: data.brand_name,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        accent_color: data.accent_color,
        header_background_color: data.header_background_color,
        header_background_opacity: data.header_background_opacity,
        carousel_items: parseCarouselItems(data.carousel_items),
      };
      
      setSettings(parsedSettings);
    } catch (error) {
      console.error("Error fetching brand settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}
