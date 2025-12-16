import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { supabase } from "@/integrations/supabase/client";
import { propertyBaseSchema } from "@/lib/validations";
import { usePropertyMutations } from "@/hooks/useProperties";
import { useSubscription } from "@/hooks/useSubscription";
import { z } from "zod";
import { Loader2, Upload, X, Image as ImageIcon, Sparkles } from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePropertyDialog({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("DE");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const { trackEvent } = useAnalyticsContext();
  const { createProperty } = usePropertyMutations();
  const { t } = useLanguage();
  const { getPropertyLimit, isFree, isPro } = useSubscription();

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast.error(t('ai.titleRequired'));
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          type: 'property_description',
          data: { title, address, city, country }
        }
      });
      
      if (error) throw error;
      if (data?.text) {
        setDescription(data.text);
        toast.success(t('ai.descriptionGenerated'));
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(t('ai.generationError'));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = propertyBaseSchema.parse({ 
        title, 
        address, 
        city,
        state_province: stateProvince,
        postal_code: postalCode,
        country,
        description 
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check property limit based on subscription plan
      const propertyLimit = getPropertyLimit();
      
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('manager_id', user.id)
        .eq('status', 'active');
      
      if (count && count >= propertyLimit) {
        const planName = isFree ? 'Free' : isPro ? 'Pro' : 'your current';
        throw new Error(`You have reached the maximum limit of ${propertyLimit} active ${propertyLimit === 1 ? 'property' : 'properties'} on the ${planName} plan. Please upgrade to add more properties.`);
      }

      // Create property first without photo
      createProperty.mutate({
        title: data.title,
        address: data.address,
        city: data.city,
        state_province: data.state_province,
        postal_code: data.postal_code,
        country: data.country,
        description: data.description || null,
        images: [],
        manager_id: user.id,
      }, {
        onSuccess: async (newProperty) => {
          // Upload photo if one was selected
          if (photoFile && newProperty?.id) {
            try {
              const fileExt = photoFile.name.split('.').pop();
              const fileName = `${newProperty.id}/profile.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from('property-photos')
                .upload(fileName, photoFile, { upsert: true });

              if (!uploadError) {
                // Update property with photo path
                await supabase
                  .from('properties')
                  .update({ images: [fileName] })
                  .eq('id', newProperty.id);
              }
            } catch (photoError) {
              console.error('Photo upload error:', photoError);
            }
          }

          // Track property creation event
          trackEvent({
            event_name: 'property_created',
            event_category: 'property_management',
            event_metadata: {
              property_id: newProperty.id,
              has_photo: !!photoFile,
            },
          });

          setTitle("");
          setAddress("");
          setCity("");
          setStateProvince("");
          setPostalCode("");
          setCountry("DE");
          setDescription("");
          setPhotoFile(null);
          setLoading(false);
          onSuccess();
        },
        onError: (error: any) => {
          setLoading(false);
          throw error;
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Error", {
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Property Photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {photoFile ? (
                  <div className="relative">
                    <img 
                      src={URL.createObjectURL(photoFile)} 
                      alt="Property preview" 
                      className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                      onClick={() => setPhotoFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => document.getElementById('create-photo-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum 5MB. JPG, PNG, or WEBP
                </p>
              </div>
              
              <input
                id="create-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith('image/')) {
                      toast.error("Please upload an image file");
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be less than 5MB");
                      return;
                    }
                    setPhotoFile(file);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Property Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('placeholders.propertyTitle')}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('placeholders.propertyAddress')}
              required
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('placeholders.city')}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                placeholder={t('placeholders.stateProvince')}
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code *</Label>
              <Input
                id="postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={t('placeholders.postalCode')}
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <CountrySelect
                value={country}
                onValueChange={setCountry}
                placeholder={t('placeholders.selectCountry')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generatingDescription || !title.trim()}
                className="h-7 text-xs"
              >
                {generatingDescription ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                {t('ai.generate')}
              </Button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('placeholders.propertyDescription')}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating..." : "Create Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
