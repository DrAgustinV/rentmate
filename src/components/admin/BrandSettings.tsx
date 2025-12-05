import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BrandSettings {
  id: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_background_color: string;
  custom_domain: string | null;
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
      setSettings(data);
      setBrandName(data.brand_name);
      setCustomDomain(data.custom_domain || "");
      setPrimaryColor(data.primary_color);
      setAccentColor(data.accent_color);
      setHeaderBackgroundColor(data.header_background_color || "173 77% 40%");
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
    }
    setLoading(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(filePath);

      return data.publicUrl;
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
    console.log("=== BRAND SETTINGS SAVE STARTED ===");
    console.log("Current settings state:", settings);
    
    // Check if settings are loaded
    if (!settings?.id) {
      console.error("Brand settings not loaded yet. Settings:", settings);
      toast({
        title: "Error",
        description: "Brand settings not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    console.log("Brand name:", brandName);
    if (!brandName.trim()) {
      toast({
        title: "Validation error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate HSL format
    const hslRegex = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
    console.log("Primary color:", primaryColor, "Valid:", hslRegex.test(primaryColor));
    console.log("Accent color:", accentColor, "Valid:", hslRegex.test(accentColor));
    console.log("Header background:", headerBackgroundColor, "Valid:", hslRegex.test(headerBackgroundColor));
    
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
      console.log("Starting logo upload...");
      const logoUrl = await uploadLogo();
      console.log("Logo upload result:", logoUrl);
      
      if (logoUrl === null && logoFile) {
        // Upload failed
        console.error("Logo upload failed");
        setLoading(false);
        return;
      }

      console.log("Getting current user...");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("Current user:", user?.id, "Error:", userError);
      
      const updates = {
        brand_name: brandName.trim(),
        custom_domain: customDomain.trim() || null,
        logo_url: logoUrl,
        primary_color: primaryColor,
        accent_color: accentColor,
        header_background_color: headerBackgroundColor,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      console.log("Updating brand settings with ID:", settings.id);
      console.log("Update payload:", updates);

      const { error, data } = await supabase
        .from("brand_settings")
        .update(updates)
        .eq("id", settings.id)
        .select();

      console.log("Update response - Error:", error);
      console.log("Update response - Data:", data);

      if (error) {
        console.error("Update error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Update successful!");

      toast({
        title: "Brand settings updated",
        description: "Changes applied successfully! The brand name, logo, and colors are now updated system-wide.",
      });

      // Refresh settings locally - realtime subscription will handle propagation
      console.log("Refreshing brand settings...");
      await fetchBrandSettings();
      console.log("=== BRAND SETTINGS SAVE COMPLETED ===");
    } catch (error: any) {
      console.error("Save error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
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
        <Input
          id="headerBackgroundColor"
          value={headerBackgroundColor}
          onChange={(e) => setHeaderBackgroundColor(e.target.value)}
          placeholder="173 77% 40%"
        />
        <div
          className="h-10 rounded border"
          style={{ backgroundColor: `hsl(${headerBackgroundColor})` }}
        />
        <p className="text-xs text-muted-foreground">
          Format: H S% L% (e.g., "173 77% 40%" for teal). This sets the header navigation background.
        </p>
      </div>

      <Button
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
    </div>
  );
}
