import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Json } from '@/integrations/supabase/types';

export interface CarouselItem {
  image_url: string;
  title: Record<string, string>;
  description: Record<string, string>;
}

export interface BrandSettings {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_background_color: string;
  header_background_opacity: number;
  custom_domain: string | null;
  carousel_items: CarouselItem[] | null;
}

function parseCarouselItems(data: Json | null): CarouselItem[] {
  if (!data || !Array.isArray(data)) return [];
  try {
    return data.map((item: any) => ({
      image_url: item.image_url || '',
      title: item.title || {},
      description: item.description || {},
    }));
  } catch {
    return [];
  }
}

export function useBrandSettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [brandName, setBrandName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState('');
  const [headerBackgroundOpacity, setHeaderBackgroundOpacity] = useState(100);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBrandSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brand_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching brand settings:', error);
      toast({
        title: 'Error loading settings',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (data) {
      const parsedCarousel = parseCarouselItems(data.carousel_items);
      const parsedSettings: BrandSettings = {
        id: data.id,
        brand_name: data.brand_name,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        accent_color: data.accent_color,
        header_background_color: data.header_background_color,
        header_background_opacity: data.header_background_opacity,
        custom_domain: data.custom_domain,
        carousel_items: parsedCarousel,
      };
      
      setSettings(parsedSettings);
      setBrandName(data.brand_name);
      setCustomDomain(data.custom_domain || '');
      setPrimaryColor(data.primary_color);
      setAccentColor(data.accent_color);
      setHeaderBackgroundColor(data.header_background_color || '173 77% 40%');
      setHeaderBackgroundOpacity(data.header_background_opacity ?? 100);
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
      setCarouselItems(parsedCarousel);
    }
    setLoading(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Logo must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return settings?.logo_url || null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings?.id) {
      toast({
        title: 'Error',
        description: 'Brand settings not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    if (!brandName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Brand name is required',
        variant: 'destructive',
      });
      return;
    }

    const hslRegex = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
    if (!hslRegex.test(primaryColor) || !hslRegex.test(accentColor) || !hslRegex.test(headerBackgroundColor)) {
      toast({
        title: 'Invalid color format',
        description: 'Colors must be in HSL format (e.g., "221 83% 53%")',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const logoUrl = await uploadLogo();
      
      if (logoUrl === null && logoFile) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = {
        brand_name: brandName.trim(),
        custom_domain: customDomain.trim() || null,
        logo_url: logoUrl,
        primary_color: primaryColor,
        accent_color: accentColor,
        header_background_color: headerBackgroundColor,
        header_background_opacity: headerBackgroundOpacity,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error, data } = await supabase
        .from('brand_settings')
        .update(updates)
        .eq('id', settings.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Failed to save changes. You may not have permission to update brand settings.');
      }

      toast({
        title: 'Brand settings updated',
        description: 'Changes applied successfully! The brand name, logo, and colors are now updated system-wide.',
      });

      await fetchBrandSettings();
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    brandName, setBrandName,
    customDomain, setCustomDomain,
    primaryColor, setPrimaryColor,
    accentColor, setAccentColor,
    headerBackgroundColor, setHeaderBackgroundColor,
    headerBackgroundOpacity, setHeaderBackgroundOpacity,
    logoFile, setLogoFile,
    logoPreview, setLogoPreview,
    carouselItems, setCarouselItems,
    loading, uploading,
    fetchBrandSettings,
    handleLogoChange,
    uploadLogo,
    handleSave,
  };
}
