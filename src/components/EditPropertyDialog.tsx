import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { supabase } from "@/integrations/supabase/client";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import { propertyBaseSchema } from "@/lib/validations";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from '@tanstack/react-query';
import { PROPERTIES_QUERY_KEY } from '@/hooks/useProperties';
import { CountrySelect } from "@/components/ui/country-select";

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  onSuccess: () => void;
}

export function EditPropertyDialog({ open, onOpenChange, property, onSuccess }: EditPropertyDialogProps) {
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (property) {
        setTitle(property.title || "");
        setAddress(property.address || "");
        setCity(property.city || "");
        setStateProvince(property.state_province || "");
        setPostalCode(property.postal_code || "");
        setCountry(property.country || "");
        setDescription(property.description || "");
        const storagePath = property.images?.[0] || "";
        setPhotoUrl(storagePath);
        
        // Fetch signed URL if storage path exists
        if (storagePath) {
          const { data } = await supabase.storage
            .from('property-photos')
            .createSignedUrl(storagePath, 3600);
          
          if (data) {
            setSignedPhotoUrl(data.signedUrl);
          }
        } else {
          setSignedPhotoUrl(undefined);
        }
      }
    };
    
    fetchPhotoUrl();
  }, [property]);

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

      const { error } = await supabase
        .from("properties")
        .update({
          title: data.title,
          address: data.address,
          city: data.city,
          state_province: data.state_province,
          postal_code: data.postal_code,
          country: data.country,
          description: data.description || null,
          images: photoUrl ? [photoUrl] : [],
          last_modified_by: user.id,
        })
        .eq("id", property.id);

      if (error) throw error;

      // Track property update event
      trackEvent({
        event_name: 'property_updated',
        event_category: 'property_management',
        event_metadata: {
          property_id: property.id,
        },
      });

      // Invalidate both query keys to refresh all views
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["property", property.id] });

      toast.success(t('common.success'), {
        description: t('dialogs.editProperty.success'),
      });

      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(t('common.validationError'), {
          description: error.errors[0].message,
        });
      } else {
        toast.error(t('common.error'), {
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
          <DialogTitle>{t('dialogs.editProperty.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PropertyPhotoUpload
            propertyId={property?.id}
            currentPhoto={signedPhotoUrl}
            onPhotoChange={async (storagePath) => {
              setPhotoUrl(storagePath);
              // Fetch new signed URL
              if (storagePath) {
                const { data } = await supabase.storage
                  .from('property-photos')
                  .createSignedUrl(storagePath, 3600);
                if (data) {
                  setSignedPhotoUrl(data.signedUrl);
                }
              } else {
                setSignedPhotoUrl(undefined);
              }
            }}
            disabled={loading}
          />

          <div className="space-y-2">
            <Label htmlFor="edit-title">{t('dialogs.createProperty.titleLabel')}</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dialogs.createProperty.titlePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Street Address *</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('dialogs.createProperty.addressPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City *</Label>
              <Input
                id="edit-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Berlin"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-state">State/Province *</Label>
              <Input
                id="edit-state"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                placeholder="Berlin"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-postal">Postal Code *</Label>
              <Input
                id="edit-postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10115"
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-country">Country *</Label>
              <CountrySelect
                value={country}
                onValueChange={setCountry}
                placeholder="Select country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{t('dialogs.createProperty.descriptionLabel')}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dialogs.createProperty.descriptionPlaceholder')}
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('dialogs.editProperty.saving') : t('dialogs.editProperty.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
