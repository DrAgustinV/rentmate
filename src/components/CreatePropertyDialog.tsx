import { useState } from "react";
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
import { usePropertyMutations } from "@/hooks/useProperties";
import { z } from "zod";
import { Loader2 } from "lucide-react";

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePropertyDialog({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { trackEvent } = useAnalyticsContext();
  const { createProperty } = usePropertyMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = propertyBaseSchema.parse({ title, address, description });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check property limit
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'max_active_properties_per_user')
        .maybeSingle();
      
      const maxLimit = settingData ? parseInt((settingData.setting_value as any).value) : 5;
      
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('manager_id', user.id)
        .eq('status', 'active');
      
      if (count && count >= maxLimit) {
        throw new Error(`You have reached the maximum limit of ${maxLimit} active properties. Please contact support to increase your limit.`);
      }

      createProperty.mutate({
        title: data.title,
        address: data.address || null,
        description: data.description || null,
        images: photoUrl ? [photoUrl] : [],
        manager_id: user.id,
      }, {
        onSuccess: (newProperty) => {
          // Track property creation event
          trackEvent({
            event_name: 'property_created',
            event_category: 'property_management',
            event_metadata: {
              property_id: newProperty.id,
              has_photo: !!photoUrl,
            },
          });

          setTitle("");
          setAddress("");
          setDescription("");
          setPhotoUrl("");
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
          <PropertyPhotoUpload
            currentPhoto={photoUrl}
            onPhotoChange={setPhotoUrl}
            disabled={loading}
          />

          <div className="space-y-2">
            <Label htmlFor="title">Property Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beachfront Villa"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Ocean Drive"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beautiful property with ocean views..."
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