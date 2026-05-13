import { useState, useEffect } from "react";
import { Upload, X, Camera, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoPath?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  onPhotoChange?: (photoPath: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  isKycVerified?: boolean;
}

export function ProfilePhotoUpload({ 
  userId,
  currentPhotoPath, 
  firstName,
  lastName,
  onPhotoChange,
  disabled,
  size = "lg",
  isKycVerified = false
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const toast = showToast;
  const { t } = useLanguage();

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const getInitials = () => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  // Load signed URL for existing photo
  useEffect(() => {
    const loadSignedUrl = async () => {
      if (currentPhotoPath) {
        const { data, error } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(currentPhotoPath, 3600);
        
        if (!error && data) {
          setPreviewUrl(data.signedUrl);
        }
      } else {
        setPreviewUrl(null);
      }
    };
    
    loadSignedUrl();
  }, [currentPhotoPath]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error({ title: t('common.error'), description: t('account.photoInvalidType') });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error({ title: t('common.error'), description: t('account.photoTooLarge') });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Generate signed URL for preview
      const { data: signedData, error: signedError } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(fileName, 3600);

      if (signedError) throw signedError;

      // Update database with storage path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', userId);

      if (updateError) throw updateError;

      setPreviewUrl(signedData.signedUrl);
      onPhotoChange?.(fileName);
      
      toast.success({ title: t('common.success'), description: t('account.photoUploaded') });
    } catch (error: any) {
      toast.error({ title: t('common.error'), description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentPhotoPath) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('profile-photos')
        .remove([currentPhotoPath]);

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onPhotoChange?.(null);
      
      toast.success({ title: t('common.success'), description: t('account.photoRemoved') });
    } catch (error: any) {
      toast.error({ title: t('common.error'), description: error.message });
    }
  };

  const badgeSizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={previewUrl || undefined} alt="Profile photo" />
          <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        {isKycVerified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm">
            <BadgeCheck className={`${badgeSizeClasses[size]} text-blue-500 fill-blue-500`} />
          </div>
        )}
        {!disabled && !isKycVerified && (
          <label 
            htmlFor="profile-photo-upload" 
            className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
          >
            <Camera className="h-3 w-3" />
          </label>
        )}
      </div>
      
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => document.getElementById('profile-photo-upload')?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {uploading ? t('common.uploading') : t('account.uploadPhoto')}
          </Button>
          {previewUrl && !disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
              onClick={handleRemove}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              {t('account.removePhoto')}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('account.photoHint')}
        </p>
      </div>
      
      <input
        id="profile-photo-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={disabled || uploading}
      />
    </div>
  );
}
