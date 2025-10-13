import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image, Video, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/dateUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Attachment {
  id: string;
  file_path: string;
  file_type: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface AttachmentGalleryProps {
  attachments: Attachment[];
  ticketId: string;
  canDelete: boolean;
}

export const AttachmentGallery = ({ attachments, ticketId, canDelete }: AttachmentGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const photos = attachments.filter((a) => a.file_type === "photo");
  const videos = attachments.filter((a) => a.file_type === "video");

  const getFileUrl = async (filePath: string, fileType: string) => {
    if (fileUrls[filePath]) return fileUrls[filePath];

    const bucket = fileType === "photo" ? "ticket-photos" : "ticket-videos";
    const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
    
    if (data?.signedUrl) {
      setFileUrls((prev) => ({ ...prev, [filePath]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      const bucket = attachment.file_type === "photo" ? "ticket-photos" : "ticket-videos";
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("ticket_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-attachments", ticketId] });
      toast({ title: "Attachment deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    },
  });

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attachments yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Image className="h-4 w-4" />
            Photos ({photos.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <AttachmentCard
                key={photo.id}
                attachment={photo}
                getFileUrl={getFileUrl}
                onImageClick={setSelectedImage}
                onDelete={canDelete ? () => deleteAttachmentMutation.mutate(photo) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({videos.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                attachment={video}
                getFileUrl={getFileUrl}
                onDelete={canDelete ? () => deleteAttachmentMutation.mutate(video) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <img src={selectedImage} alt="Full size" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AttachmentCard = ({ attachment, getFileUrl, onImageClick, onDelete }: any) => {
  const [url, setUrl] = useState<string | null>(null);

  useState(() => {
    getFileUrl(attachment.file_path, attachment.file_type).then(setUrl);
  });

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted border">
      {url ? (
        <img
          src={url}
          alt={attachment.original_filename}
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(url)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {onDelete && (
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 text-xs">
        <p className="truncate font-medium">{attachment.original_filename}</p>
        <p className="text-muted-foreground">
          {formatDateTime(attachment.created_at)}
        </p>
      </div>
    </div>
  );
};

const VideoCard = ({ attachment, getFileUrl, onDelete }: any) => {
  const [url, setUrl] = useState<string | null>(null);

  useState(() => {
    getFileUrl(attachment.file_path, attachment.file_type).then(setUrl);
  });

  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted border">
      {url ? (
        <video controls className="w-full">
          <source src={url} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="w-full aspect-video flex items-center justify-center">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {onDelete && (
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="p-3 text-xs">
        <p className="truncate font-medium">{attachment.original_filename}</p>
        <p className="text-muted-foreground">
          {formatDateTime(attachment.created_at)} • {(attachment.file_size_bytes / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
};
