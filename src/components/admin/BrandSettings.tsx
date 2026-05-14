import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService, documentService } from "@/services";
import { STORAGE_BUCKETS, FILE_SIZE_LIMITS } from "@/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CarouselItemsManager } from "./CarouselItemsManager";
import { Separator } from "@/components/ui/separator";
import { Json } from "@/integrations/supabase/types";

interface CarouselItem {
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
  custom_domain: string | null;
  carousel_items: CarouselItem[] | null;
}

function parseCarouselItems(data: Json | null): CarouselItem[] {
  if (!data || !Array.isArray(data)) return [];
  try {
    return data.map((item: any) => ({
      image_url: item.image_url || "",
      title: item.title || {},
      description: item.description || {},
    }));
  } catch {
    return [];
  }
}

export function BrandSettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [brandName, setBrandName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState("");
  const [headerBackgroundOpacity, setHeaderBackgroundOpacity] = useState(100);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const fetchBrandSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("brand_settings")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Error fetching brand settings:", error);
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
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
      setCustomDomain(data.custom_domain || "");
      setPrimaryColor(data.primary_color);
      setAccentColor(data.accent_color);
      setHeaderBackgroundColor(data.header_background_color || "173 77% 40%");
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
      if (file.size > FILE_SIZE_LIMITS.BRAND_LOGO) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
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
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      await documentService.uploadFile(STORAGE_BUCKETS.BRAND_LOGOS, filePath, logoFile, {
        cacheControl: "3600",
        upsert: false,
      });

      return await documentService.getPublicUrl(STORAGE_BUCKETS.BRAND_LOGOS, filePath);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings?.id) {
      toast({
        title: "Error",
        description: "Brand settings not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (!brandName.trim()) {
      toast({
        title: "Validation error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    const hslRegex = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
    if (!hslRegex.test(primaryColor) || !hslRegex.test(accentColor) || !hslRegex.test(headerBackgroundColor)) {
      toast({
        title: "Invalid color format",
        description: "Colors must be in HSL format (e.g., '221 83% 53%')",
        variant: "destructive",
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

      const user = await authService.getCurrentUser();
      
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
        .from("brand_settings")
        .update(updates)
        .eq("id", settings.id)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Failed to save changes. You may not have permission to update brand settings.");
      }

      toast({
        title: "Brand settings updated",
        description: "Changes applied successfully! The brand name, logo, and colors are now updated system-wide.",
      });

      await fetchBrandSettings();
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brandName">Brand Name</Label>
        <Input
          id="brandName"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="RentMate"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customDomain">Custom Domain</Label>
        <Input
          id="customDomain"
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder="rentmate.me"
        />
        <p className="text-xs text-muted-foreground">
          Enter your custom domain without https:// (e.g., rentmate.me). Used for invitation emails and public links.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Brand Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <div className="w-16 h-16 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <Input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleLogoChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, or SVG. Max 2MB.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">
            <Palette className="inline h-4 w-4 mr-1" />
            Primary Color (HSL)
          </Label>
          <Input
            id="primaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="221 83% 53%"
          />
          <div
            className="h-10 rounded border"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          />
          <p className="text-xs text-muted-foreground">
            Format: H S% L% (e.g., "221 83% 53%")
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accentColor">
            <Palette className="inline h-4 w-4 mr-1" />
            Accent Color (HSL)
          </Label>
          <Input
            id="accentColor"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            placeholder="199 89% 48%"
          />
          <div
            className="h-10 rounded border"
            style={{ backgroundColor: `hsl(${accentColor})` }}
          />
          <p className="text-xs text-muted-foreground">
            Format: H S% L% (e.g., "199 89% 48%")
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headerBackgroundColor">
          <Palette className="inline h-4 w-4 mr-1" />
          Header Background Color (HSL)
        </Label>
        <div className="flex gap-3 items-center">
          <Input
            id="headerBackgroundColor"
            value={headerBackgroundColor}
            onChange={(e) => setHeaderBackgroundColor(e.target.value)}
            placeholder="173 77% 40%"
            className="flex-1"
          />
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              min={0}
              max={100}
              value={headerBackgroundOpacity}
              onChange={(e) => setHeaderBackgroundOpacity(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div
          className="h-10 rounded border"
          style={{ backgroundColor: `hsla(${headerBackgroundColor}, ${headerBackgroundOpacity / 100})` }}
        />
        <p className="text-xs text-muted-foreground">
          Format: H S% L% (e.g., "173 77% 40%" for teal). Opacity: 0-100%. This sets the header navigation background.
        </p>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || uploading || !settings}
        className="w-full"
      >
        {loading || uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            {uploading ? "Uploading..." : "Saving..."}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Save Brand Settings
          </>
        )}
      </Button>

      <div className="bg-muted/50 border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Changes will be applied instantly across the application for all users via real-time updates.
        </p>
      </div>

      <Separator className="my-8" />

      {/* Carousel Items Manager */}
      {settings?.id && (
        <CarouselItemsManager
          items={carouselItems}
          onUpdate={setCarouselItems}
          settingsId={settings.id}
        />
      )}
    </div>
  );
}
