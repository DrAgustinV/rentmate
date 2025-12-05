import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { FileText, Download, Trash2, Upload, ChevronDown, Eye } from "lucide-react";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { cn } from "@/lib/utils";

interface DocumentsTabProps {
  propertyId: string;
  userRole: { isManager: boolean } | null | undefined;
}

export function DocumentsTab({ propertyId, userRole }: DocumentsTabProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showUpload, setShowUpload] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);

  const { data: propertyTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["property-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select(`
          *,
          profiles:uploaded_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq("property_id", propertyId)
        .eq("document_category", "property")
        .is("tenancy_id", null)
        .order("document_title", { ascending: true })
        .order("version", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = propertyTemplates?.find((d) => d.id === documentId);
      if (!doc) throw new Error("Document not found");

      const { error: storageError } = await supabase.storage.from("property-documents").remove([doc.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("property_documents").delete().eq("id", documentId);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success(t("properties.documentDeleted"));
      queryClient.invalidateQueries({ queryKey: ["property-templates", propertyId] });
    },
    onError: () => {
      toast.error(t("properties.documentDeleteError"));
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUploaderName = (doc: any): string => {
    const profile = doc.profiles;
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile?.email || "Unknown";
  };

  const VIEWABLE_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const handleOpenDocument = async (doc: any) => {
    const extension = doc.file_name.toLowerCase().substring(doc.file_name.lastIndexOf('.'));
    const isViewable = VIEWABLE_EXTENSIONS.includes(extension);
    
    if (isViewable) {
      const newWindow = window.open('', '_blank');
      
      const { data, error } = await supabase.storage
        .from("property-documents")
        .createSignedUrl(doc.file_path, 3600);
      
      if (error || !data?.signedUrl) {
        newWindow?.close();
        toast.error(t("properties.openError"));
        return;
      }
      
      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      }
    } else {
      handleDownloadDocument(doc);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    const { data, error } = await supabase.storage.from("property-documents").download(doc.file_path);

    if (error) {
      toast.error(t("properties.downloadError"));
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const groupedDocs = propertyTemplates?.reduce(
    (acc, doc) => {
      if (!acc[doc.document_title]) {
        acc[doc.document_title] = [];
      }
      acc[doc.document_title].push(doc);
      return acc;
    },
    {} as Record<string, typeof propertyTemplates>,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("properties.propertyTemplates")}</CardTitle>
            <CardDescription>{t("properties.propertyTemplatesDescription")}</CardDescription>
          </div>
          {userRole?.isManager && (
            <Button onClick={() => setShowUpload(!showUpload)} variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              {showUpload ? t("common.cancel") : t("properties.uploadTemplate")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showUpload && !selectedParentDoc && (
          <>
            <PropertyDocumentUpload
              propertyId={propertyId}
              category="property"
              onUploadComplete={() => {
                setShowUpload(false);
                queryClient.invalidateQueries({ queryKey: ["property-templates", propertyId] });
              }}
            />
            <Separator />
          </>
        )}

        {selectedParentDoc && (
          <>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                {t("properties.propertyDocuments.uploadNewVersion")}: {selectedParentDoc.title}
              </p>
            </div>
            <PropertyDocumentUpload
              propertyId={propertyId}
              category="property"
              parentDocumentId={selectedParentDoc.id}
              parentDocumentTitle={selectedParentDoc.title}
              onUploadComplete={() => {
                setSelectedParentDoc(null);
                queryClient.invalidateQueries({ queryKey: ["property-templates", propertyId] });
              }}
            />
            <Button variant="outline" onClick={() => setSelectedParentDoc(null)}>
              {t("common.cancel")}
            </Button>
            <Separator />
          </>
        )}

        {templatesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !propertyTemplates || propertyTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("properties.noTemplates")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedDocs || {}).map(([docTitle, docs]) => {
              const latestDoc = docs[0];
              const olderVersions = docs.slice(1);

              return (
                <div key={docTitle} className="border rounded-lg">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h4 className="font-medium truncate">{docTitle}</h4>
                          {docs.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {docs.length} {t("properties.propertyDocuments.versions")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            v{latestDoc.version} · {formatFileSize(latestDoc.file_size_bytes)} ·{" "}
                            {new Date(latestDoc.created_at).toLocaleDateString()}
                          </p>
                          {latestDoc.description && <p className="italic">{latestDoc.description}</p>}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDocument(latestDoc)} title={t("common.open")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(latestDoc)} title={t("common.download")}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {userRole?.isManager && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedParentDoc({ id: latestDoc.id, title: docTitle })}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocumentMutation.mutate(latestDoc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {olderVersions.length > 0 && (
                      <div>
                        <Collapsible
                          open={expandedDoc === docTitle}
                          onOpenChange={(open) => setExpandedDoc(open ? docTitle : null)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 mr-2 transition-transform",
                                  expandedDoc === docTitle && "transform rotate-180",
                                )}
                              />
                              {t("properties.propertyDocuments.previousVersions")} ({olderVersions.length})
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <PropertyDocumentVersionHistory
                              versions={olderVersions}
                              onDownload={handleDownloadDocument}
                              onOpen={handleOpenDocument}
                              onDelete={userRole?.isManager ? (doc) => deleteDocumentMutation.mutate(doc.id) : undefined}
                              formatFileSize={formatFileSize}
                              getUploaderName={getUploaderName}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
