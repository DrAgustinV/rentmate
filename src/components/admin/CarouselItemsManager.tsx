import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, GripVertical, Image } from "lucide-react";
import { useLanguageSettings } from "@/hooks/useLanguageSettings";
import { Json } from "@/integrations/supabase/types";

interface CarouselItem {
  image_url: string;
  title: Record<string, string>;
  description: Record<string, string>;
}

interface CarouselItemsManagerProps {
  items: CarouselItem[];
  onUpdate: (items: CarouselItem[]) => void;
  settingsId: string;
}

// Language display names
const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
};

export function CarouselItemsManager({ items, onUpdate, settingsId }: CarouselItemsManagerProps) {
  const { toast } = useToast();
  const { enabledLanguages } = useLanguageSettings();
  const [uploading, setUploading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddItem = () => {
    const newItem: CarouselItem = {
      image_url: "",
      title: { en: "", es: "" },
      description: { en: "", es: "" },
    };
    onUpdate([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const handleItemChange = (index: number, field: keyof CarouselItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const handleTextChange = (
    index: number,
    field: "title" | "description",
    lang: string,
    value: string
  ) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: { ...updated[index][field], [lang]: value },
    };
    onUpdate(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(index);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `carousel-${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("brand-logos").getPublicUrl(fileName);

      handleItemChange(index, "image_url", data.publicUrl);
      toast({ title: "Image uploaded", description: "Carousel image uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("brand_settings")
        .update({
          carousel_items: items as unknown as Json,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settingsId);

      if (error) throw error;

      toast({ title: "Carousel saved", description: "Carousel items updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving carousel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Landing Page Carousel</h3>
        <Button variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No carousel items yet</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Slide
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 space-y-4 bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Slide {index + 1}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-start gap-4">
                {item.image_url ? (
                  <div className="w-32 h-20 rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={item.image_url}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-20 rounded-lg border border-dashed bg-muted flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(index, file);
                    }}
                    disabled={uploading === index}
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or WEBP. Max 5MB.
                  </p>
                  <Input
                    placeholder="Or paste image URL..."
                    value={item.image_url}
                    onChange={(e) => handleItemChange(index, "image_url", e.target.value)}
                  />
                  {uploading === index && (
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Multi-language Title and Description - Tabbed */}
            <Tabs defaultValue={enabledLanguages[0] || "en"} className="border-t pt-3">
              <TabsList className="mb-3">
                {enabledLanguages.map((langCode) => (
                  <TabsTrigger key={langCode} value={langCode} className="uppercase text-xs">
                    {langCode}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {enabledLanguages.map((langCode) => (
                <TabsContent key={langCode} value={langCode} className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Title ({languageNames[langCode]})</Label>
                      <Input
                        value={item.title[langCode] || ""}
                        onChange={(e) =>
                          handleTextChange(index, "title", langCode, e.target.value)
                        }
                        placeholder={`Title in ${languageNames[langCode] || langCode}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description ({languageNames[langCode]})</Label>
                      <Textarea
                        value={item.description[langCode] || ""}
                        onChange={(e) =>
                          handleTextChange(index, "description", langCode, e.target.value)
                        }
                        placeholder={`Description in ${languageNames[langCode] || langCode}`}
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Save Carousel
            </>
          )}
        </Button>
      )}

      <div className="bg-muted/50 border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Upload images (recommended size: 800×400px) or paste Unsplash URLs. 
          Add translations for each active language to display localized content on the landing page.
        </p>
      </div>
    </div>
  );
}
