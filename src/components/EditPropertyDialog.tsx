import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import { propertyBaseSchema } from "@/lib/validations";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: any;
  onSuccess: () => void;
}

export function EditPropertyDialog({ open, onOpenChange, property, onSuccess }: EditPropertyDialogProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (property) {
      setTitle(property.title || "");
      setAddress(property.address || "");
      setDescription(property.description || "");
      setPhotoUrl(property.images?.[0] || "");
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = propertyBaseSchema.parse({ title, address, description });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("properties")
        .update({
          title: data.title,
          address: data.address || null,
          description: data.description || null,
          images: photoUrl ? [photoUrl] : [],
          last_modified_by: user.id,
        })
        .eq("id", property.id);

      if (error) throw error;

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
            currentPhoto={photoUrl}
            onPhotoChange={setPhotoUrl}
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
            <Label htmlFor="edit-address">{t('dialogs.createProperty.addressLabel')}</Label>
            <Input
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('dialogs.createProperty.addressPlaceholder')}
            />
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