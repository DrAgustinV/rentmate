import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface PropertyDocumentUploadProps {
  propertyId: string;
  onUploadComplete: () => void;
  parentDocumentId?: string;
  parentDocumentTitle?: string;
  category: 'property' | 'tenancy';
  tenancyId?: string;
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
  "image/jpeg",
  "image/png",
  "image/webp",
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
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

export default function PropertyDocumentUpload({
  propertyId,
  onUploadComplete,
  parentDocumentId,
  parentDocumentTitle,
  category,
  tenancyId,
}: PropertyDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", ["property_doc_max_size_mb", "property_doc_max_count"]);

      if (error) throw error;

      return data.reduce((acc, setting) => {
        acc[setting.setting_key] = JSON.parse(setting.setting_value as string).value;
        return acc;
      }, {} as Record<string, number>);
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: parentDocument } = useQuery({
    queryKey: ["parent-document", parentDocumentId],
    queryFn: async () => {
      if (!parentDocumentId) return null;
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("id", parentDocumentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!parentDocumentId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentUser) throw new Error("Not authenticated");

      const maxSizeMB = settings?.property_doc_max_size_mb || 50;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
      }

      const { data: canUpload, error: validateError } = await supabase.rpc(
        "can_upload_property_document",
        {
          _property_id: propertyId,
          _file_size_bytes: file.size,
        }
      );

      if (validateError) throw validateError;
      if (!canUpload) {
        throw new Error("Upload validation failed. Check document count and size limits.");
      }

      let version = 1;
      let parentDocId = null;
      let finalTitle = documentTitle.trim();

      if (parentDocumentId && parentDocument) {
        // Explicit version upload
        version = parentDocument.version + 1;
        parentDocId = parentDocumentId;
        finalTitle = parentDocument.document_title;

        // Mark previous version as not latest
        await supabase
          .from("property_documents")
          .update({ is_latest_version: false })
          .eq("id", parentDocumentId);
      } else if (!finalTitle) {
        throw new Error("Document title is required");
      }

      const extension = file.name.match(/\.[^.]+$/)?.[0] || "";
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const fileName = `${baseName}_v${version}${extension}`;
      const filePath = `${propertyId}/${crypto.randomUUID()}_v${version}${extension}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("property-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const fileType = extension.replace(".", "");
      const { error: dbError } = await supabase.from("property_documents").insert({
        property_id: propertyId,
        uploaded_by: currentUser.id,
        document_title: finalTitle,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size_bytes: file.size,
        mime_type: file.type,
        version: version,
        parent_document_id: parentDocId,
        description: description || null,
        is_latest_version: true,
        document_category: category,
        tenancy_id: tenancyId || null,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
    },
    onSuccess: () => {
      // Track document upload event
      trackEvent({
        event_name: 'document_uploaded',
        event_category: 'document_management',
        event_metadata: {
          property_id: propertyId,
          document_category: category,
          is_new_version: !!parentDocumentId,
        },
      });
      
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      setDescription("");
      setDocumentTitle("");
      setUploadProgress(0);
      onUploadComplete();
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        toast.error("File type not allowed. Please upload a document or image file.");
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

  const maxSizeMB = settings?.property_doc_max_size_mb || 50;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
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
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {t("properties.propertyDocuments.dragAndDropHint")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("properties.propertyDocuments.uploadHint").replace("{size}", String(maxSizeMB))}
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
            >
              Select File
            </Button>
          </>
        )}
      </div>

      {selectedFile && (
        <>
          {parentDocumentId && parentDocument && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <FileText className="h-5 w-5" />
                <div>
                  <p className="font-medium">Uploading new version of:</p>
                  <p className="text-sm">{parentDocument.document_title} (current version: {parentDocument.version})</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Your file will be saved as version {parentDocument.version + 1}</p>
                </div>
              </div>
            </div>
          )}

          {!parentDocumentId && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="documentTitle">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documentTitle"
                placeholder="e.g., Lease Agreement, Insurance Policy, Inventory Report"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                disabled={uploadMutation.isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Give this document a descriptive title. All versions will share this title.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for this document..."
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

          <Button
            onClick={() => uploadMutation.mutate(selectedFile)}
            disabled={uploadMutation.isPending}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </>
      )}
    </div>
  );
}
