import { useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { documentService } from "@/services";
import { STORAGE_BUCKETS, FILE_SIZE_LIMITS } from "@/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { PROPERTIES_QUERY_KEY } from "@/hooks/useProperties";
import { TENANT_PROPERTIES_QUERY_KEY } from "@/hooks/useTenantProperties";
import { useNotification } from "@/hooks/useNotification";

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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  // Sync preview URL with prop changes
  useEffect(() => {
    setPreviewUrl(currentPhoto);
  }, [currentPhoto]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error(t('common.error'), "Please upload an image file");
      return;
    }

    // Validate file size
    if (file.size > FILE_SIZE_LIMITS.PROPERTY_PHOTO) {
      error(t('common.error'), "Image must be less than 5MB");
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

      await documentService.uploadFile(STORAGE_BUCKETS.PROPERTY_PHOTOS, fileName, file, { upsert: true });

      const signedUrl = await documentService.getSignedUrl(STORAGE_BUCKETS.PROPERTY_PHOTOS, fileName);

      // Update database with storage path
      const { error: updateError } = await supabase
        .from('properties')
        .update({ images: [fileName] })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      // Set preview to signed URL for display
      setPreviewUrl(signedUrl);
      // Pass storage path to parent, not signed URL
      onPhotoChange(fileName);
      
      // Invalidate queries to refresh property data everywhere
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TENANT_PROPERTIES_QUERY_KEY] });
      // Invalidate individual property query for PropertyDetails page
      if (propertyId) {
        queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      }
      
      success(t('common.success'), t('properties.photoUploaded'));
    } catch (err: any) {
      error(t('common.error'), err.message);
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
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Property" 
                className="w-64 h-64 rounded-lg object-cover border-2 border-border"
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
            <div className="w-64 h-64 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="w-full max-w-xs">
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
