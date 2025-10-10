import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Trash2, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import PropertyDocumentUpload from "./PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "./PropertyDocumentVersionHistory";

interface PropertyDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  isManager: boolean;
}

interface Document {
  id: string;
  property_id: string;
  uploaded_by: string;
  document_title: string;
  document_category: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  mime_type: string;
  version: number;
  parent_document_id: string | null;
  description: string | null;
  is_latest_version: boolean;
  created_at: string;
}

interface DocumentWithUploader extends Document {
  uploader_name?: string;
}

export default function PropertyDocumentsDialog({
  open,
  onOpenChange,
  propertyId,
  isManager,
}: PropertyDocumentsDialogProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVersionFor, setUploadingVersionFor] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["property-documents", propertyId],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("file_name")
        .order("version", { ascending: false });

      if (error) throw error;

      // Fetch uploader names
      const uploaderIds = [...new Set(docs?.map(d => d.uploaded_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", uploaderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (docs || []).map(doc => ({
        ...doc,
        uploader_name: (() => {
          const profile = profileMap.get(doc.uploaded_by);
          if (!profile) return "Unknown";
          return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown";
        })()
      })) as DocumentWithUploader[];
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: Document) => {
      const { error: storageError } = await supabase.storage
        .from("property-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-documents", propertyId] });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    },
  });

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("property-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const toggleExpand = (baseName: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };

  // Group documents by their document_title
  const groupedDocs = documents.reduce((acc, doc) => {
    const title = doc.document_title;
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(doc);
    return acc;
  }, {} as Record<string, DocumentWithUploader[]>);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getUploaderName = (doc: DocumentWithUploader) => {
    return doc.uploader_name || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Property Documents</DialogTitle>
          <DialogDescription>
            View, upload, and manage documents for this property. Both managers and tenants can upload documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={() => setShowUpload(!showUpload)} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {showUpload ? "Hide Upload" : "Upload New Document"}
          </Button>

        {showUpload && (
          <PropertyDocumentUpload
            propertyId={propertyId}
            parentDocumentId={uploadingVersionFor?.id}
            parentDocumentTitle={uploadingVersionFor?.title}
            onUploadComplete={() => {
              setShowUpload(false);
              setUploadingVersionFor(null);
              queryClient.invalidateQueries({ queryKey: ["property-documents", propertyId] });
            }}
          />
        )}

          <Separator />

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading documents...</p>
            ) : Object.keys(groupedDocs).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedDocs).map(([title, docs]) => {
                  const latestDoc = docs.find((d) => d.is_latest_version) || docs[0];
                  const hasVersions = docs.length > 1;
                  const isExpanded = expandedDocs.has(title);

                  return (
                    <div key={title} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {hasVersions && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(title)}
                                className="h-6 w-6 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base truncate">{latestDoc.document_title}</h4>
                              <p className="text-xs text-muted-foreground truncate">{latestDoc.file_name}</p>
                            </div>
                            {latestDoc.is_latest_version && (
                              <Badge variant="default">v{latestDoc.version}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1 ml-8">
                            <p>
                              {formatFileSize(latestDoc.file_size_bytes)} ·
                              Uploaded by {getUploaderName(latestDoc)} ·{" "}
                              {format(new Date(latestDoc.created_at), "MMM dd, yyyy")}
                            </p>
                            {latestDoc.description && (
                              <p className="italic">{latestDoc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadingVersionFor({
                                id: latestDoc.id,
                                title: latestDoc.document_title,
                              });
                              setShowUpload(true);
                            }}
                            title="Upload a new version of this document"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(latestDoc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isManager && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(latestDoc)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {hasVersions && isExpanded && (
                        <PropertyDocumentVersionHistory
                          versions={docs.filter((d) => !d.is_latest_version).map(d => ({
                            id: d.id,
                            file_name: d.file_name,
                            file_size_bytes: d.file_size_bytes,
                            version: d.version,
                            created_at: d.created_at,
                            description: d.description,
                            uploader_name: d.uploader_name
                          }))}
                          onDownload={(v) => {
                            const doc = docs.find(d => d.id === v.id);
                            if (doc) downloadDocument(doc);
                          }}
                          onDelete={isManager ? (v) => {
                            const doc = docs.find(d => d.id === v.id);
                            if (doc) deleteMutation.mutate(doc);
                          } : undefined}
                          formatFileSize={formatFileSize}
                          getUploaderName={(v) => v.uploader_name || "Unknown"}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
