import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { cn } from "@/lib/utils";

interface CreatePropertyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".xls",
  ".xlsx",
  ".ods",
  ".txt",
];

export const CreatePropertyTemplateDialog = ({
  open,
  onOpenChange,
}: CreatePropertyTemplateDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentUser) throw new Error("Not authenticated");
      if (!documentTitle.trim()) throw new Error(t('dialogs.pleaseEnterTitle'));

      const extension = file.name.match(/\.[^.]+$/)?.[0] || "";
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const fileName = `${baseName}${extension}`;
      const filePath = `templates/${currentUser.id}/${crypto.randomUUID()}${extension}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("property-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const fileType = extension.replace(".", "");
      const { error: dbError } = await supabase.from("property_documents").insert({
        property_id: null, // NULL for global templates
        uploaded_by: currentUser.id,
        document_title: documentTitle.trim(),
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size_bytes: file.size,
        mime_type: file.type,
        version: 1,
        description: description || null,
        is_latest_version: true,
        document_category: 'property',
        tenancy_id: null,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
    },
    onSuccess: () => {
      trackEvent({
        event_name: 'property_template_created',
        event_category: 'document_management',
        event_metadata: {
          document_title: documentTitle,
        },
      });
      
      toast.success(t('documentTemplates.templateCreated'));
      queryClient.invalidateQueries({ queryKey: ["property-templates"] });
      setSelectedFile(null);
      setDocumentTitle("");
      setDescription("");
      setUploadProgress(0);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : t('documentTemplates.uploadFailed'));
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        toast.error(t('dialogs.fileTypeNotAllowed'));
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(t('dialogs.pleaseSelectFile'));
      return;
    }
    if (!documentTitle.trim()) {
      toast.error(t('dialogs.pleaseEnterTitle'));
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('documentTemplates.createTemplate')}</DialogTitle>
          <DialogDescription>
            {t('configuration.documentTemplatesHelper')}
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="documentTitle">{t('dialogs.templateName')}</Label>
              <Input
                id="documentTitle"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={t('dialogs.templateNamePlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('dialogs.templateNameHelper')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('dialogs.descriptionOptional')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('dialogs.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('dialogs.selectFile')}</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                  selectedFile && "border-primary bg-primary/5"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      {t('dialogs.dragDropFile')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('dialogs.allowedTypes')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('dialogs.uploadProgress')}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={uploadMutation.isPending || !selectedFile}
          >
            {uploadMutation.isPending ? t('dialogs.uploading') : t('documentTemplates.createTemplate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};