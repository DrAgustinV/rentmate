import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  UserMinus,
  Mail,
  X,
  Clock,
  ChevronDown,
  Upload,
  Copy,
  Download,
  AlertTriangle,
  Ticket,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { CopyTemplatesDialog } from "@/components/CopyTemplatesDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: string;
  started_at: string;
  ended_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
}

interface Invitation {
  id: string;
  email: string;
  expires_at: string;
  created_at: string;
}

interface TenancyDocument {
  id: string;
  document_title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by: string;
  description: string | null;
  version: number;
  is_latest_version: boolean;
  parent_document_id: string | null;
}

const createInviteSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .email({ message: t("dialogs.inviteTenant.emailPlaceholder") }),
  });

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [removingTenant, setRemovingTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [copyTemplatesOpen, setCopyTemplatesOpen] = useState(false);
  const [expandedTenancyId, setExpandedTenancyId] = useState<string | null>(null);
  const [tenancyDocsMap, setTenancyDocsMap] = useState<Record<string, TenancyDocument[]>>({});
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
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
      return { isManager: propertyData?.manager_id === user.id };
    },
    enabled: !!propertyId,
  });

  const { data: activeTenants } = useQuery({
    queryKey: ["active-tenants", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          id,
          tenant_id,
          tenancy_status,
          started_at,
          ended_at,
          notes,
          profiles!fk_property_tenants_profiles (
            email,
            first_name,
            last_name
          )
        `,
        )
        .eq("property_id", propertyId)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .order("started_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        return {
          ...item,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  // For backward compatibility, get the first active tenant
  const currentTenant = activeTenants && activeTenants.length > 0 ? activeTenants[0] : null;

  const { data: tenancyDocuments, refetch: refetchDocuments } = useQuery({
    queryKey: ["tenancy-documents", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("tenancy_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenancyDocument[];
    },
    enabled: !!currentTenant,
  });

  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  const { data: tenancyHistory } = useQuery({
    queryKey: ["tenancy-history", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          id,
          tenant_id,
          tenancy_status,
          started_at,
          ended_at,
          profiles!fk_property_tenants_profiles (
            email,
            first_name,
            last_name
          )
        `,
        )
        .eq("property_id", propertyId)
        .in("tenancy_status", ["ending_tenancy", "inactive"])
        .order("started_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data.map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        return {
          ...item,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  const { data: propertyCount } = useQuery({
    queryKey: ["property-count"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", user.id)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch property limit setting
  useQuery({
    queryKey: ["max-properties-limit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "max_active_properties_per_user")
        .maybeSingle();

      if (!error && data) {
        const limit = parseInt((data.setting_value as any).value);
        setMaxPropertiesLimit(limit);
        return limit;
      }
      return 5;
    },
  });

  const loadTenancyDocuments = async (tenancyId: string) => {
    if (tenancyDocsMap[tenancyId]) return;

    const { data, error } = await supabase
      .from("property_documents")
      .select("*")
      .eq("tenancy_id", tenancyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTenancyDocsMap((prev) => ({ ...prev, [tenancyId]: data as TenancyDocument[] }));
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const inviteSchema = createInviteSchema(t);
      const data = inviteSchema.parse({ email });

      const { data: profiles } = await supabase.from("profiles").select("id").eq("email", data.email).maybeSingle();

      if (profiles) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId!)
          .eq("tenant_id", profiles.id)
          .maybeSingle();
        if (existing) throw new Error(t("dialogs.inviteTenant.alreadyTenant"));
      }

      // Check for ANY existing invitation (pending or cancelled)
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", data.email)
        .eq("property_id", propertyId!)
        .maybeSingle();

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      if (existingInvite) {
        if (existingInvite.status === "pending") {
          throw new Error(t("dialogs.inviteTenant.alreadyInvited"));
        }

        // If cancelled, reactivate it with new token and expiration
        if (existingInvite.status === "cancelled") {
          const { error } = await supabase
            .from("invitations")
            .update({
              token,
              expires_at: expiresAt.toISOString(),
              status: "pending",
              invited_user_id: profiles?.id || null,
            })
            .eq("id", existingInvite.id);

          if (error) throw error;
        }
      } else {
        // If no existing invitation, create new one
        const { error } = await supabase.from("invitations").insert({
          token,
          email: data.email,
          property_id: propertyId,
          expires_at: expiresAt.toISOString(),
          invited_user_id: profiles?.id || null,
        });

        if (error) throw error;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ""} ${managerProfile.last_name || ""}`.trim() || "Property Manager"
        : "Property Manager";

      await supabase.functions.invoke("send-tenant-invitation", {
        body: {
          email: data.email,
          propertyTitle: property?.title,
          propertyAddress: null,
          managerName,
          token,
          expiresAt: expiresAt.toISOString(),
          language: localStorage.getItem("language") || "en",
          projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
          propertyId: propertyId,
        },
      });
    },
    onSuccess: () => {
      toast({ title: t("dialogs.inviteTenant.sent"), description: `${t("dialogs.inviteTenant.sentDesc")} ${email}` });
      setEmail("");
      refetchInvitations();
    },
    onError: (error: any) => {
      if (error instanceof z.ZodError) {
        toast({ title: t("common.validationError"), description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
    },
  });

  const removeTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("property_tenants")
        .update({
          tenancy_status: "ending_tenancy",
          ended_at: new Date().toISOString(),
        })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.tenancyEnding") });
      queryClient.invalidateQueries({ queryKey: ["current-tenant"] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-history"] });
      setRemovingTenant(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.invitationCancelled") });
      refetchInvitations();
      setCancellingInvitation(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getUploaderName = (doc: TenancyDocument) => {
    return doc.uploaded_by ? "User" : "Unknown";
  };

  const toggleDocumentExpansion = (docTitle: string) => {
    setExpandedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docTitle)) {
        newSet.delete(docTitle);
      } else {
        newSet.add(docTitle);
      }
      return newSet;
    });
  };

  const groupedDocuments = tenancyDocuments?.reduce(
    (acc, doc) => {
      if (!acc[doc.document_title]) {
        acc[doc.document_title] = [];
      }
      acc[doc.document_title].push(doc);
      return acc;
    },
    {} as Record<string, TenancyDocument[]>,
  );

  Object.keys(groupedDocuments || {}).forEach((title) => {
    groupedDocuments![title].sort((a, b) => b.version - a.version);
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("property_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("properties.propertyDocuments.deleteSuccess") });
      refetchDocuments();
    },
    onError: (error: any) => {
      toast({
        title: t("properties.propertyDocuments.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const isReadOnly = currentTenant?.tenancy_status === "ending_tenancy";

  const downloadDocument = async (doc: TenancyDocument) => {
    try {
      const { data, error } = await supabase.storage.from("property-documents").download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/properties/${propertyId}/details`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{t("properties.tenantManagement")}</p>
          </div>
        </div>

        {/* Property Limit Warning */}
        {userRole?.isManager && propertyCount !== undefined && propertyCount >= maxPropertiesLimit - 1 && (
          <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">{t("properties.freePlanLimitTitle")}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                {propertyCount >= maxPropertiesLimit
                  ? `You have reached the limit of ${maxPropertiesLimit} active properties. Please contact support to increase your limit.`
                  : `You have created ${propertyCount} active properties. You can create ${maxPropertiesLimit - propertyCount} more.`}
              </p>
            </div>
          </div>
        )}

        {/* Active Tenants Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {t("tenants.activeTenants")} {activeTenants && activeTenants.length > 0 && `(${activeTenants.length})`}
              </span>
              <Button
                variant="outline"
                onClick={() => navigate(`/properties/${propertyId}/tickets`)}
                className="hidden sm:flex"
              >
                <Ticket className="h-4 w-4 mr-2" />
                {t("tenants.viewAllTickets")}
              </Button>
            </CardTitle>
            <CardDescription>{t("tenants.tenantManagementDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Tenants Section */}
            {activeTenants && activeTenants.length > 0 ? (
              <div className="space-y-3">
                {activeTenants.map((tenant) => (
                  <div key={tenant.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              tenant.tenancy_status === "active" ? "bg-green-500" : "bg-yellow-500",
                            )}
                          />
                          <p className="font-medium">{getTenantName(tenant)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("properties.tenancyStarted")}: {formatDate(tenant.started_at)}
                        </p>
                        {tenant.notes && <p className="text-xs text-muted-foreground mt-2 italic">{tenant.notes}</p>}
                      </div>
                      {userRole?.isManager && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingTenant(tenant)}>
                            {t("common.edit")}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setRemovingTenant(tenant)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("dialogs.manageTenants.noTenants")}</p>
            )}

            {/* Mobile Quick Action Button */}
            <div className="sm:hidden pt-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/properties/${propertyId}/tickets`)}
                className="w-full"
              >
                <Ticket className="h-4 w-4 mr-2" />
                {t("tenants.viewAllTickets")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tenancy Documents Section */}
        {currentTenant && (
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.tenancyDocuments")}</CardTitle>
              <CardDescription>{isReadOnly && t("properties.readOnlyAccess")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isReadOnly && (
                <div className="flex gap-2">
                  <Button onClick={() => setUploadDocumentOpen(!uploadDocumentOpen)} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    {t("properties.uploadTenancyDocument")}
                  </Button>
                  {userRole?.isManager && (
                    <Button onClick={() => setCopyTemplatesOpen(true)} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      {t("properties.copyTemplates")}
                    </Button>
                  )}
                </div>
              )}

              {uploadDocumentOpen && !isReadOnly && !selectedParentDoc && (
                <PropertyDocumentUpload
                  propertyId={propertyId!}
                  category="tenancy"
                  tenancyId={currentTenant.id}
                  onUploadComplete={() => {
                    refetchDocuments();
                    setUploadDocumentOpen(false);
                  }}
                />
              )}

              {selectedParentDoc && !isReadOnly && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">
                      {t("properties.propertyDocuments.uploadNewVersion")}: {selectedParentDoc.title}
                    </p>
                  </div>
                  <PropertyDocumentUpload
                    propertyId={propertyId!}
                    category="tenancy"
                    tenancyId={currentTenant.id}
                    parentDocumentId={selectedParentDoc.id}
                    parentDocumentTitle={selectedParentDoc.title}
                    onUploadComplete={() => {
                      refetchDocuments();
                      setSelectedParentDoc(null);
                    }}
                  />
                  <Button variant="outline" onClick={() => setSelectedParentDoc(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              )}

              {groupedDocuments && Object.keys(groupedDocuments).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedDocuments).map(([title, docs]) => {
                    const latestDoc = docs[0];
                    const olderVersions = docs.slice(1);
                    const isExpanded = expandedDocuments.has(title);

                    return (
                      <div key={title} className="border rounded-lg">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{title}</h4>
                                {docs.length > 1 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {docs.length} {t("properties.propertyDocuments.versions")}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  v{latestDoc.version} · {formatFileSize(latestDoc.file_size_bytes)} ·{" "}
                                  {formatDate(latestDoc.created_at)}
                                </p>
                                {latestDoc.description && <p className="italic">{latestDoc.description}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => downloadDocument(latestDoc)}>
                                <Download className="h-3 w-3" />
                              </Button>
                              {!isReadOnly && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedParentDoc({ id: latestDoc.id, title })}
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                  {userRole?.isManager && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteDocumentMutation.mutate(latestDoc.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {olderVersions.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDocumentExpansion(title)}
                                className="w-full justify-between"
                              >
                                <span className="text-xs">
                                  {isExpanded
                                    ? t("properties.propertyDocuments.previousVersions")
                                    : t("properties.propertyDocuments.seeVersions")}
                                </span>
                                <ChevronDown
                                  className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                                />
                              </Button>

                              {isExpanded && (
                                <PropertyDocumentVersionHistory
                                  versions={olderVersions}
                                  onDownload={downloadDocument}
                                  onDelete={
                                    userRole?.isManager ? (doc) => deleteDocumentMutation.mutate(doc.id) : undefined
                                  }
                                  formatFileSize={formatFileSize}
                                  getUploaderName={getUploaderName}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("properties.noTenancyDocuments")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invite New Tenant Section (Manager Only) */}
        {userRole?.isManager && (
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.inviteNewTenant")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("dialogs.inviteTenant.emailLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("dialogs.inviteTenant.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && email.trim()) {
                        inviteMutation.mutate(email.trim());
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const trimmedEmail = email.trim();
                      if (trimmedEmail) {
                        inviteMutation.mutate(trimmedEmail);
                      }
                    }}
                    disabled={inviteMutation.isPending || !email.trim()}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t("dialogs.inviteTenant.send")}
                  </Button>
                </div>
              </div>

              {invitations && invitations.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h3 className="font-medium">{t("dialogs.manageTenants.pendingInvitations")}</h3>
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t("dialogs.manageTenants.expires")}: {formatDate(inv.expires_at)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCancellingInvitation(inv)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tenancy History Section (Manager Only) */}
        {userRole?.isManager && tenancyHistory && tenancyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("properties.tenancyHistory")}</CardTitle>
              <CardDescription>{t("properties.pastTenancies")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenancyHistory.map((tenancy) => (
                <Collapsible
                  key={tenancy.id}
                  open={expandedTenancyId === tenancy.id}
                  onOpenChange={(open) => {
                    if (open) {
                      setExpandedTenancyId(tenancy.id);
                      loadTenancyDocuments(tenancy.id);
                    } else {
                      setExpandedTenancyId(null);
                    }
                  }}
                >
                  <div className="border rounded-lg p-3">
                    <CollapsibleTrigger className="w-full flex items-center justify-between">
                      <div className="text-left">
                        <p className="font-medium">{getTenantName(tenancy)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tenancy.started_at)} -{" "}
                          {tenancy.ended_at ? formatDate(tenancy.ended_at) : t("properties.active")}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedTenancyId === tenancy.id ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 pt-2 border-t">
                      {tenancyDocsMap[tenancy.id] ? (
                        tenancyDocsMap[tenancy.id].length > 0 ? (
                          <div className="space-y-2">
                            {tenancyDocsMap[tenancy.id].map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{doc.document_title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(doc.created_at)} · {(doc.file_size_bytes / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("properties.noDocuments")}</p>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-transparent rounded-full animate-spin" />
                          {t("common.loading")}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Remove Tenant Dialog */}
      <AlertDialog open={!!removingTenant} onOpenChange={() => setRemovingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {removingTenant && getTenantName(removingTenant)} {t("dialogs.manageTenants.removeMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => removingTenant && removeTenantMutation.mutate(removingTenant.id)}>
              {t("dialogs.manageTenants.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={() => setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.cancelInvitationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingInvitation &&
                `${t("dialogs.manageTenants.cancelInvitationDesc")} ${cancellingInvitation.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingInvitation && cancelInvitationMutation.mutate(cancellingInvitation.id)}
            >
              {t("dialogs.manageTenants.cancelInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Templates Dialog */}
      {currentTenant && (
        <CopyTemplatesDialog
          open={copyTemplatesOpen}
          onOpenChange={setCopyTemplatesOpen}
          propertyId={propertyId!}
          tenancyId={currentTenant.id}
        />
      )}

      {/* Edit Tenant Dialog */}
      <EditTenantDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        propertyId={propertyId!}
      />
    </AppLayout>
  );
}
