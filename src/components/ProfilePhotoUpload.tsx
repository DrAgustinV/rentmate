import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCachedSignedUrl } from "@/lib/signedUrlCache";
import { documentService, profileService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";
import { Upload, Camera, Trash2 } from "lucide-react";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoPath: string | null;
  firstName: string;
  lastName: string;
  onPhotoChange: (path: string | null) => void;
  isKycVerified?: boolean;
}

export function ProfilePhotoUpload({
  userId,
  currentPhotoPath,
  firstName,
  lastName,
  onPhotoChange,
  isKycVerified,
}: ProfilePhotoUploadProps) {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (currentPhotoPath) {
        try {
          const url = await getCachedSignedUrl(
            STORAGE_BUCKETS.PROFILE_PHOTOS,
            currentPhotoPath,
            3600
          );
          setPreviewUrl(url);
        } catch {
          setPreviewUrl(null);
        }
      } else {
        setPreviewUrl(null);
      }
    };

    loadSignedUrl();
  }, [currentPhotoPath]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      await documentService.uploadFile(
        STORAGE_BUCKETS.PROFILE_PHOTOS,
        fileName,
        file,
        { upsert: true }
      );

      onPhotoChange(fileName);

      const signedUrl = await getCachedSignedUrl(
        STORAGE_BUCKETS.PROFILE_PHOTOS,
        fileName,
        3600
      );
      setPreviewUrl(signedUrl);
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    setError(null);
    try {
      if (currentPhotoPath) {
        await documentService.deleteFile(STORAGE_BUCKETS.PROFILE_PHOTOS, currentPhotoPath);
      }
      await profileService.updateProfile(userId, { avatarStoragePath: null } as any);
      onPhotoChange(null);
      setPreviewUrl(null);
      showToast.success(t('common.success') || 'Photo removed');
    } catch (err) {
      showToast.error(t('common.error') || 'Failed to remove photo');
    }
  };

  const getInitials = () => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32 ring-2 ring-muted">
          <AvatarImage src={previewUrl || undefined} alt={`${firstName} ${lastName}`} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary font-medium">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        {isKycVerified && (
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-background">
            <Camera className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="photo-upload"
        disabled={uploading}
      />

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Change Photo"}
          </Button>
          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemovePhoto}
              className="gap-2 text-destructive hover:text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.remove') || 'Remove'}
            </Button>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}