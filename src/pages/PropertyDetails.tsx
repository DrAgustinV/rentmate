import { useState } from "react";
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
import { Save, ArrowLeft, FileText, Download, Trash2, Upload as UploadIcon, Archive } from "lucide-react";
import { PropertyPhotoUpload } from "@/components/PropertyPhotoUpload";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
        .eq("is_latest_version", true)
        .order("created_at", { ascending: false });

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
                    currentPhoto={property.images?.[0]}
                    onPhotoChange={(url) => {
                      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
                    }}
                  />
                ) : (
                  property.images?.[0] && (
                    <div className="space-y-2">
                      <Label>{t("properties.photo")}</Label>
                      <img
                        src={property.images[0]}
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
            {showUpload && (
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
                {Object.entries(groupedDocs || {}).map(([docTitle, docs]) => (
                  <Collapsible
                    key={docTitle}
                    open={expandedDoc === docTitle}
                    onOpenChange={(open) => setExpandedDoc(open ? docTitle : null)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{docTitle}</p>
                              <p className="text-sm text-muted-foreground">
                                {docs.length} {docs.length === 1 ? "version" : "versions"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDocument(docs[0]);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {userRole?.isManager && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDocumentMutation.mutate(docs[0].id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Separator />
                        <div className="p-4">
                          <p className="text-sm text-muted-foreground">
                            Version {docs[0].version} · Uploaded {new Date(docs[0].created_at).toLocaleDateString()}
                          </p>
                          {docs[0].description && <p className="text-sm mt-2">{docs[0].description}</p>}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {userRole?.isManager && property.status === "active" && (
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

        {userRole?.isManager && !activeTenant && property.status === "active" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">{t("properties.archivePropertyTitle")}</CardTitle>
              <CardDescription>{t("properties.archivePropertyWarning")}</CardDescription>
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
            <AlertDialogDescription>{t("properties.archivePropertyDescription")}</AlertDialogDescription>
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
