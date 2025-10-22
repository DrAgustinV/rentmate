import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Save, ArrowLeft, FileText, Download, Trash2, Upload as UploadIcon, Archive, ChevronDown, Upload } from "lucide-react";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState<
    "sold" | "no_longer_managing" | "merged_with_other_property" | "other"
  >("sold");
  const [archiveNotes, setArchiveNotes] = useState<string>("");
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);
  const [propertyPhotoUrl, setPropertyPhotoUrl] = useState<string | undefined>();

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();

      if (error) throw error;

      setTitle(data.title);
      setAddress(data.address || "");
      setDescription(data.description || "");

      return data;
    },
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: propertyData } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId)
        .single();

      return {
        isManager: propertyData?.manager_id === user.id,
        userId: user.id,
      };
    },
    enabled: !!propertyId,
  });

  const { data: activeTenant } = useQuery({
    queryKey: ["active-tenant", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          *,
          profiles:tenant_id (
            first_name,
            last_name,
            email
          )
        `,
        )
        .eq("property_id", propertyId)
        .eq("tenancy_status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  // Query for tenant's own tenancy record (when viewing as tenant)
  const { data: currentUserTenancy } = useQuery({
    queryKey: ["current-user-tenancy", propertyId, userRole?.userId],
    queryFn: async () => {
      if (userRole?.isManager || !userRole?.userId) return null;
      
      const { data, error } = await supabase
        .from("property_tenants")
        .select("id, tenancy_status, started_at, ended_at")
        .eq("property_id", propertyId)
        .eq("tenant_id", userRole.userId)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId && !!userRole?.userId && !userRole?.isManager,
  });

  // Query for tenancy documents (only for tenants viewing their own documents)
  const { data: tenancyDocuments, isLoading: tenancyDocsLoading } = useQuery({
    queryKey: ["tenancy-documents", propertyId, currentUserTenancy?.id],
    queryFn: async () => {
      if (!currentUserTenancy?.id) return [];

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
        .eq("document_category", "tenancy")
        .eq("tenancy_id", currentUserTenancy.id)
        .order("document_title", { ascending: true })
        .order("version", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId && !!currentUserTenancy?.id && !userRole?.isManager,
  });

  const { data: propertyTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["property-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select(
          `
          *,
          profiles:uploaded_by (
            first_name,
            last_name,
            email
          )
        `,
        )
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

  const updatePropertyMutation = useMutation({
    mutationFn: async (updates: { title: string; address: string; description: string }) => {
      const { error } = await supabase.from("properties").update(updates).eq("id", propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("properties.updateSuccess"));
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error(t("properties.updateError"));
    },
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
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error(t("properties.documentDeleteError"));
    },
  });

  const archivePropertyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({
          status: "inactive",
          deleted_at: new Date().toISOString(),
          delete_reason: archiveReason as "sold" | "no_longer_managing" | "merged_with_other_property" | "other",
          modification_reason: archiveNotes || null,
        })
        .eq("id", propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("properties.propertyArchived"));
      setShowArchiveDialog(false);
      setArchiveReason("sold");
      setArchiveNotes("");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(t("properties.archiveFailed"));
      console.error("Archive error:", error);
    },
  });

  const handleSave = () => {
    updatePropertyMutation.mutate({ title, address, description });
  };

  const fetchPropertyPhotoUrl = async (storagePath: string) => {
    if (!storagePath) {
      setPropertyPhotoUrl(undefined);
      return;
    }
    
    const { data, error } = await supabase.storage
      .from('property-photos')
      .createSignedUrl(storagePath, 3600);
    
    if (!error && data) {
      setPropertyPhotoUrl(data.signedUrl);
    }
  };

  // Fetch signed URL when property loads or changes
  useEffect(() => {
    if (property?.images?.[0]) {
      fetchPropertyPhotoUrl(property.images[0]);
    } else {
      setPropertyPhotoUrl(undefined);
    }
  }, [property?.images]);

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

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("properties.notFound")}</p>
        </div>
      </AppLayout>
    );
  }

  const tenantName = activeTenant?.profiles
    ? `${activeTenant.profiles.first_name || ""} ${activeTenant.profiles.last_name || ""}`.trim() ||
      activeTenant.profiles.email
    : t("properties.noTenant");

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

  const groupedTenancyDocs = tenancyDocuments?.reduce(
    (acc, doc) => {
      if (!acc[doc.document_title]) {
        acc[doc.document_title] = [];
      }
      acc[doc.document_title].push(doc);
      return acc;
    },
    {} as Record<string, typeof tenancyDocuments>,
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{property.title}</h1>
              <p className="text-muted-foreground">
                {userRole?.isManager ? t("properties.editProperty") : t("properties.viewProperty")}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("properties.propertyInformation")}</CardTitle>
            <CardDescription>{t("properties.editPropertyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {userRole?.isManager ? (
                  <PropertyPhotoUpload
                    propertyId={propertyId!}
                    currentPhoto={propertyPhotoUrl}
                    onPhotoChange={async (storagePath) => {
                      // Fetch new signed URL after upload
                      if (storagePath) {
                        await fetchPropertyPhotoUrl(storagePath);
                      }
                      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
                    }}
                  />
                ) : (
                  propertyPhotoUrl && (
                    <div className="space-y-2">
                      <Label>{t("properties.photo")}</Label>
                      <img
                        src={propertyPhotoUrl}
                        alt={property.title}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("properties.title")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsEditing(true);
                      }}
                    />
                  ) : (
                    <p className="text-sm py-2">{title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("properties.address")}</Label>
                  {userRole?.isManager ? (
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setIsEditing(true);
                      }}
                    />
                  ) : (
                    <p className="text-sm py-2">{address}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("properties.status")}</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={property.status === "active" ? "default" : "secondary"}>{property.status}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("properties.currentTenant")}</Label>
                  <p className="text-sm text-muted-foreground">{tenantName}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="description">{t("properties.description")}</Label>
              {userRole?.isManager ? (
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsEditing(true);
                  }}
                  rows={4}
                  placeholder={t("properties.descriptionPlaceholder")}
                />
              ) : (
                <p className="text-sm py-2 whitespace-pre-wrap">{description || t("properties.noDescription")}</p>
              )}
            </div>

            {isEditing && userRole?.isManager && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTitle(property.title);
                    setAddress(property.address || "");
                    setDescription(property.description || "");
                    setIsEditing(false);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={updatePropertyMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {t("common.save")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {userRole?.isManager && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("properties.propertyTemplates")}</CardTitle>
                  <CardDescription>{t("properties.propertyTemplatesDescription")}</CardDescription>
                </div>
                {userRole?.isManager && (
                  <Button onClick={() => setShowUpload(!showUpload)} variant="outline" size="sm">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {showUpload ? t("common.cancel") : t("properties.uploadTemplate")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showUpload && !selectedParentDoc && (
                <>
                  <PropertyDocumentUpload
                    propertyId={propertyId!}
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
                    propertyId={propertyId!}
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
                          {/* Header with title and version badge */}
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

                            {/* Action buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(latestDoc)}>
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

                          {/* Version history */}
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
        )}

        {/* Tenancy Documents Section - Only for Tenants */}
        {!userRole?.isManager && currentUserTenancy && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("properties.tenancyDocuments")}</CardTitle>
                  <CardDescription>{t("properties.tenancyDocumentsDescription")}</CardDescription>
                </div>
                {!selectedParentDoc && (
                  <Button onClick={() => setShowUpload(!showUpload)} variant="outline" size="sm">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {showUpload ? t("common.cancel") : t("properties.uploadDocument")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload new document */}
              {showUpload && !selectedParentDoc && (
                <>
                  <PropertyDocumentUpload
                    propertyId={propertyId!}
                    category="tenancy"
                    tenancyId={currentUserTenancy.id}
                    onUploadComplete={() => {
                      setShowUpload(false);
                      queryClient.invalidateQueries({ queryKey: ["tenancy-documents", propertyId, currentUserTenancy.id] });
                    }}
                  />
                  <Separator />
                </>
              )}

              {/* Upload new version */}
              {selectedParentDoc && (
                <>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">
                      {t("properties.propertyDocuments.uploadNewVersion")}: {selectedParentDoc.title}
                    </p>
                  </div>
                  <PropertyDocumentUpload
                    propertyId={propertyId!}
                    category="tenancy"
                    tenancyId={currentUserTenancy.id}
                    parentDocumentId={selectedParentDoc.id}
                    parentDocumentTitle={selectedParentDoc.title}
                    onUploadComplete={() => {
                      setSelectedParentDoc(null);
                      queryClient.invalidateQueries({ queryKey: ["tenancy-documents", propertyId, currentUserTenancy.id] });
                    }}
                  />
                  <Button variant="outline" onClick={() => setSelectedParentDoc(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Separator />
                </>
              )}

              {/* Documents list */}
              {tenancyDocsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !tenancyDocuments || tenancyDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("properties.noDocuments")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedTenancyDocs || {}).map(([docTitle, docs]) => {
                    const latestDoc = docs[0];
                    const olderVersions = docs.slice(1);

                    return (
                      <div key={docTitle} className="border rounded-lg">
                        <div className="p-4 space-y-3">
                          {/* Header with title and version badge */}
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

                            {/* Action buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleDownloadDocument(latestDoc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedParentDoc({ id: latestDoc.id, title: docTitle })}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Version history */}
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
                                        expandedDoc === docTitle && "transform rotate-180"
                                      )}
                                    />
                                    {t("properties.propertyDocuments.previousVersions")} ({olderVersions.length})
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <PropertyDocumentVersionHistory
                                    versions={olderVersions}
                                    onDownload={handleDownloadDocument}
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
        )}

        {userRole?.isManager && (
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => navigate(`/properties/${propertyId}/maintenance`)}
                className="w-full sm:w-auto"
              >
                {t("properties.viewMaintenance")}
              </Button>
            </CardContent>
          </Card>
        )}

        {userRole?.isManager && property.status === "active" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t("properties.archivePropertyTitle")}</CardTitle>
              <CardDescription>
                {activeTenant 
                  ? `${t("properties.archivePropertyWithTenantWarning")} (${tenantName})`
                  : t("properties.archivePropertyWarning")
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowArchiveDialog(true)} className="gap-2">
                <Archive className="h-4 w-4" />
                {t("properties.archiveProperty")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("properties.archivePropertyTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {activeTenant 
                ? `${t("properties.archivePropertyWithTenantDescription")} (${tenantName})`
                : t("properties.archivePropertyDescription")
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("properties.archiveReason")}</Label>
              <Select
                value={archiveReason}
                onValueChange={(value) =>
                  setArchiveReason(value as "sold" | "no_longer_managing" | "merged_with_other_property" | "other")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("properties.selectReason")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sold">{t("properties.archiveReasonSold")}</SelectItem>
                  <SelectItem value="no_longer_managing">{t("properties.archiveReasonNoLongerManaging")}</SelectItem>
                  <SelectItem value="merged_with_other_property">{t("properties.archiveReasonMerged")}</SelectItem>
                  <SelectItem value="other">{t("properties.archiveReasonOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("properties.archiveNotes")}</Label>
              <Textarea
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                placeholder={t("properties.archiveNotesPlaceholder")}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archivePropertyMutation.mutate()}
              disabled={!archiveReason}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("properties.confirmArchive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
