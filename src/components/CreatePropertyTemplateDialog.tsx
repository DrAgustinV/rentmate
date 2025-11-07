import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

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
      if (!documentTitle.trim()) throw new Error("Document title is required");

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
        property_id: currentUser.id, // Using user_id as a placeholder for templates
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
      
      toast.success("Document template created successfully");
      queryClient.invalidateQueries({ queryKey: ["property-templates"] });
      setSelectedFile(null);
      setDocumentTitle("");
      setDescription("");
      setUploadProgress(0);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload template");
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        toast.error("File type not allowed. Please upload a document file.");
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
      toast.error("Please select a file to upload");
      return;
    }
    if (!documentTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Document Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadMutation.isPending}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Allowed: PDF, DOC, DOCX, ODT, XLS, XLSX, ODS, TXT
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.join(",")}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Select File
                </Button>
              </>
            )}
          </div>

          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="documentTitle">
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="documentTitle"
                  placeholder="e.g., Standard Lease Agreement, Move-in Checklist"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  disabled={uploadMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Give this template a descriptive name that you'll recognize later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this template..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploadMutation.isPending}
                  rows={3}
                />
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
