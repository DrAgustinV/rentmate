import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface PropertyPhotoUploadProps {
  propertyId?: string;
  currentPhoto?: string;
  onPhotoChange: (photoUrl: string) => void;
  disabled?: boolean;
}

export function PropertyPhotoUpload({ 
  propertyId, 
  currentPhoto, 
  onPhotoChange,
  disabled 
}: PropertyPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentPhoto);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // If no propertyId yet (during creation), just show preview
    if (!propertyId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        setPreviewUrl(url);
        onPhotoChange(url);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Upload to storage if propertyId exists
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Generate signed URL for preview (expires in 1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('property-photos')
        .createSignedUrl(fileName, 3600);

      if (signedError) throw signedError;

      // Update database with storage path
      const { error: updateError } = await supabase
        .from('properties')
        .update({ images: [fileName] })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      // Set preview to signed URL for display
      setPreviewUrl(signedData.signedUrl);
      // Pass storage path to parent, not signed URL
      onPhotoChange(fileName);
      
      toast({
        title: t('common.success'),
        description: t('properties.photoUploaded')
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onPhotoChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative">
          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Property" 
                className="w-24 h-24 rounded-lg object-cover border-2 border-border"
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
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
            disabled={disabled || uploading}
            onClick={() => document.getElementById('photo-upload')?.click()}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? t('properties.uploading') : t('properties.uploadPhoto')}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            {t('properties.photoHint')}
          </p>
        </div>
        
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
}
