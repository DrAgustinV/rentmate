import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Video, 
  Trash2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import { InspectionItem, ConditionRating, CONDITION_RATINGS } from "./types";
import { cn } from "@/lib/utils";

interface RoomInspectionItemProps {
  item: InspectionItem;
  inspectionId: string;
  canEdit: boolean;
  onUpdate: (params: { itemId: string; updates: Partial<InspectionItem> }) => Promise<void>;
  onDelete: () => void;
}

export function RoomInspectionItem({
  item,
  inspectionId,
  canEdit,
  onUpdate,
  onDelete,
}: RoomInspectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(!item.condition);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleConditionChange = async (condition: ConditionRating) => {
    await onUpdate({ itemId: item.id, updates: { condition } });
  };

  const handleNotesChange = async (notes: string) => {
    await onUpdate({ itemId: item.id, updates: { notes } });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPhotos: string[] = [...item.photos];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${inspectionId}/${item.id}/photos/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-media')
          .getPublicUrl(fileName);

        newPhotos.push(publicUrl);
      }

      await onUpdate({ itemId: item.id, updates: { photos: newPhotos } });
      showToast.success({ title: `${files.length} photo(s) uploaded` });
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error({ title: "Failed to upload photos" });
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newVideos: string[] = [...item.videos];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          showToast.error({ title: "Video must be under 50MB" });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${inspectionId}/${item.id}/videos/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-media')
          .getPublicUrl(fileName);

        newVideos.push(publicUrl);
      }

      await onUpdate({ itemId: item.id, updates: { videos: newVideos } });
      showToast.success({ title: `${files.length} video(s) uploaded` });
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error({ title: "Failed to upload videos" });
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const newPhotos = item.photos.filter((_, i) => i !== index);
    await onUpdate({ itemId: item.id, updates: { photos: newPhotos } });
  };

  const handleRemoveVideo = async (index: number) => {
    const newVideos = item.videos.filter((_, i) => i !== index);
    await onUpdate({ itemId: item.id, updates: { videos: newVideos } });
  };

  return (
    <Card className={cn(
      "transition-all",
      item.condition && !isExpanded && "bg-muted/30"
    )}>
      <CardHeader 
        className="py-3 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {item.room_name}
            {item.condition && (
              <Badge 
                className={cn(
                  "ml-2",
                  CONDITION_RATINGS.find(r => r.value === item.condition)?.color
                )}
              >
                {item.condition}
              </Badge>
            )}
            {item.photos.length > 0 && (
              <Badge variant="outline" className="ml-1">
                <ImageIcon className="h-3 w-3 mr-1" />
                {item.photos.length}
              </Badge>
            )}
            {item.videos.length > 0 && (
              <Badge variant="outline" className="ml-1">
                <Video className="h-3 w-3 mr-1" />
                {item.videos.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Condition Rating */}
          <div className="space-y-2">
            <Label>Condition Rating</Label>
            <div className="flex flex-wrap gap-2">
              {CONDITION_RATINGS.map((rating) => (
                <Button
                  key={rating.value}
                  variant={item.condition === rating.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => canEdit && handleConditionChange(rating.value)}
                  disabled={!canEdit}
                  className={cn(
                    item.condition === rating.value && rating.color,
                    item.condition === rating.value && "text-white"
                  )}
                >
                  {rating.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add notes about this room's condition..."
              value={item.notes || ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={!canEdit}
              rows={2}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              {canEdit && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Add Photos
                  </Button>
                </>
              )}
            </div>
            {item.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {item.photos.map((photo, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={photo}
                      alt={`${item.room_name} photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Videos</Label>
              {canEdit && (
                <>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Add Videos
                  </Button>
                </>
              )}
            </div>
            {item.videos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {item.videos.map((video, index) => (
                  <div key={index} className="relative group">
                    <video
                      src={video}
                      className="w-full h-32 object-cover rounded-lg"
                      controls
                    />
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveVideo(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
