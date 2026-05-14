import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image, Video, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService, documentService, ticketService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

interface AttachmentUploadProps {
  ticketId: string;
}

export const AttachmentUpload = ({ ticketId }: AttachmentUploadProps) => {
  const { t } = useLanguage();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  // Fetch system settings for limits
  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "ticket_max_photos",
          "ticket_max_videos",
          "ticket_photo_max_size_mb",
          "ticket_video_max_size_mb",
        ]);

      if (error) throw error;
      return data.reduce((acc, setting) => {
        const value = typeof setting.setting_value === 'object' && setting.setting_value !== null
          ? (setting.setting_value as any).value
          : setting.setting_value;
        acc[setting.setting_key] = Number(value);
        return acc;
      }, {} as Record<string, number>);
    },
  });

  // Fetch current attachment counts
  const { data: currentCounts } = useQuery({
    queryKey: ["ticket-attachment-counts", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select("file_type")
        .eq("ticket_id", ticketId);

      if (error) throw error;
      return {
        photos: data.filter((a) => a.file_type === "photo").length,
        videos: data.filter((a) => a.file_type === "video").length,
      };
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const uploads = [];

      // Upload photos
      for (const file of photoFiles) {
        const filePath = `${ticketId}/${Date.now()}-${file.name}`;
        await documentService.uploadFile(STORAGE_BUCKETS.TICKET_PHOTOS, filePath, file);

        await ticketService.addTicketAttachment({
          ticket_id: ticketId,
          file_path: filePath,
          file_type: "photo",
          original_filename: file.name,
          file_size_bytes: file.size,
          uploaded_by: user.id,
        });
        uploads.push(file.name);
      }

      // Upload video
      if (videoFile) {
        const filePath = `${ticketId}/${Date.now()}-${videoFile.name}`;
        await documentService.uploadFile(STORAGE_BUCKETS.TICKET_VIDEOS, filePath, videoFile);

        await ticketService.addTicketAttachment({
          ticket_id: ticketId,
          file_path: filePath,
          file_type: "video",
          original_filename: videoFile.name,
          file_size_bytes: videoFile.size,
          uploaded_by: user.id,
        });
        uploads.push(videoFile.name);
      }

      return uploads;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-attachments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-attachment-counts", ticketId] });
      setPhotoFiles([]);
      setVideoFile(null);
      setUploadProgress(0);
      toast({ title: "Attachments uploaded successfully" });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxPhotos = settings?.ticket_max_photos || 10;
    const maxSizeMB = settings?.ticket_photo_max_size_mb || 5;
    const currentPhotos = currentCounts?.photos || 0;

    if (currentPhotos + photoFiles.length + files.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `Maximum ${maxPhotos} photos allowed per ticket`,
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `Photos must be under ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }
    }

    setPhotoFiles((prev) => [...prev, ...files]);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMB = settings?.ticket_video_max_size_mb || 50;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Videos must be under ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setVideoFile(file);
  };

  const handleUpload = () => {
    if (photoFiles.length === 0 && !videoFile) return;
    uploadMutation.mutate();
  };

  const maxPhotos = settings?.ticket_max_photos || 10;
  const maxPhotoSizeMB = settings?.ticket_photo_max_size_mb || 5;
  const maxVideoSizeMB = settings?.ticket_video_max_size_mb || 50;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("photo-upload")?.click()}
          >
            <Image className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("tickets.uploadHintPhotos").replace("{size}", String(maxPhotoSizeMB)).replace("{count}", String(maxPhotos))}
          </p>
        </div>

        <div className="space-y-1">
          <input
            type="file"
            id="video-upload"
            accept="video/*"
            onChange={handleVideoChange}
            className="hidden"
            disabled={!!videoFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("video-upload")?.click()}
            disabled={!!videoFile}
          >
            <Video className="h-4 w-4 mr-2" />
            Add Video
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("tickets.uploadHintVideo").replace("{size}", String(maxVideoSizeMB))}
          </p>
        </div>
      </div>

      {/* Preview selected files */}
      {(photoFiles.length > 0 || videoFile) && (
        <div className="space-y-2">
          {photoFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
              <span className="truncate flex-1">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {videoFile && (
            <div className="flex items-center justify-between p-2 bg-muted rounded text-sm">
              <span className="truncate flex-1">{videoFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setVideoFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            size="sm"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
          </Button>

          {uploadMutation.isPending && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </div>
      )}
    </div>
  );
};
