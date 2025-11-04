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
import { z } from "zod";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePropertyDialog({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) {
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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

      // Create property first without photo
      createProperty.mutate({
        title: data.title,
        address: data.address || null,
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
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
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