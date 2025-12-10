import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  X,
  Clock,
  ChevronDown,
  Download,
  AlertTriangle,
  Eye,
  BadgeCheck,
  CalendarClock,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { TenancySetupCard } from "@/components/property-hub/TenancySetupCard";
import { TenancyRequirement } from "@/hooks/useTenancyRequirements";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  planned_ending_date: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
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

interface TenantsTabProps {
  propertyId: string;
  propertyCountry?: string;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  currentTenant: Tenant | null;
  setRemovingTenant: (tenant: Tenant | null) => void;
  setEditingTenant: (tenant: Tenant | null) => void;
  setCancellingInvitation: (invitation: Invitation | null) => void;
  onEndTenancy?: (tenant: Tenant) => void;
  // Tenancy setup props
  pendingRequirement?: TenancyRequirement | null;
  canSetupNewTenancy?: boolean;
  hasEndingTenancy?: boolean;
  onStartSetup?: () => void;
  onSendInvitation?: (req: TenancyRequirement) => void;
  onCancelSetup?: (req: TenancyRequirement) => void;
  onResendInvitation?: (req: TenancyRequirement) => void;
  isDeleting?: boolean;
  isResending?: boolean;
}

export function TenantsTab({
  propertyId,
  propertyCountry,
  userRole,
  isReadOnly,
  currentTenant,
  setRemovingTenant,
  setEditingTenant,
  setCancellingInvitation,
  onEndTenancy,
  // Tenancy setup props
  pendingRequirement,
  canSetupNewTenancy,
  hasEndingTenancy,
  onStartSetup,
  onSendInvitation,
  onCancelSetup,
  onResendInvitation,
  isDeleting,
  isResending,
}: TenantsTabProps) {
  const { t } = useLanguage();
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [expandedTenancyId, setExpandedTenancyId] = useState<string | null>(null);
  const [tenancyDocsMap, setTenancyDocsMap] = useState<Record<string, TenancyDocument[]>>({});
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);

  // Lazy-loaded queries - only fetched when TenantsTab is rendered
  const { data: activeTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["active-tenants", propertyId],
    queryFn: async () => {
      const { data: tenancies, error: tenanciesError } = await supabase
        .from("property_tenants")
        .select("id, tenant_id, tenancy_status, started_at, ended_at, planned_ending_date, notes")
        .eq("property_id", propertyId)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .order("started_at", { ascending: false });

      if (tenanciesError) throw tenanciesError;
      if (!tenancies || tenancies.length === 0) return [];

      const tenantIds = tenancies.map(t => t.tenant_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, avatar_url, kyc_status")
        .in("id", tenantIds);

      if (profilesError) throw profilesError;

      return tenancies.map((tenancy) => {
        const profile = profiles?.find(p => p.id === tenancy.tenant_id);
        return {
          ...tenancy,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          kyc_status: profile?.kyc_status || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  const { data: invitations } = useQuery({
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
        .select(`
          id,
          tenant_id,
          tenancy_status,
          started_at,
          ended_at,
          profiles!property_tenants_tenant_id_fkey (
            email,
            first_name,
            last_name
          )
        `)
        .eq("property_id", propertyId)
        .in("tenancy_status", ["ending_tenancy", "historic"])
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", user.id)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: userRole?.isManager,
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
    enabled: userRole?.isManager,
  });

  // Load signed URLs for tenant avatars
  useEffect(() => {
    const loadAvatarUrls = async () => {
      if (!activeTenants) return;
      
      const urlMap: Record<string, string> = {};
      for (const tenant of activeTenants) {
        if (tenant.avatar_url) {
          const { data } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(tenant.avatar_url, 3600);
          if (data) {
            urlMap[tenant.tenant_id] = data.signedUrl;
          }
        }
      }
      setAvatarUrls(urlMap);
    };
    
    loadAvatarUrls();
  }, [activeTenants]);

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

  const downloadDocument = async (doc: TenancyDocument) => {
    try {
      const { data, error } = await supabase.storage.from('property-documents').download(doc.file_path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
    }
  };

  const VIEWABLE_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const openDocument = async (doc: TenancyDocument) => {
    const extension = doc.file_name.toLowerCase().substring(doc.file_name.lastIndexOf('.'));
    const isViewable = VIEWABLE_EXTENSIONS.includes(extension);
    
    if (isViewable) {
      const newWindow = window.open('', '_blank');
      
      try {
        const { data, error } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.file_path, 3600);
        
        if (error || !data?.signedUrl) {
          newWindow?.close();
          return;
        }
        
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        }
      } catch (error: any) {
        newWindow?.close();
      }
    } else {
      downloadDocument(doc);
    }
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  const getTenantInitials = (tenant: Tenant) => {
    const first = tenant.first_name?.charAt(0) || "";
    const last = tenant.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || tenant.email.charAt(0).toUpperCase();
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenancy Setup Card */}
      {userRole?.isManager && !isReadOnly && onStartSetup && onSendInvitation && onCancelSetup && (
        <TenancySetupCard
          pendingRequirement={pendingRequirement || null}
          canSetupNewTenancy={canSetupNewTenancy || false}
          hasEndingTenancy={hasEndingTenancy || false}
          onStartSetup={onStartSetup}
          onSendInvitation={onSendInvitation}
          onCancelSetup={onCancelSetup}
          onResendInvitation={onResendInvitation}
          isDeleting={isDeleting}
          isResending={isResending}
        />
      )}

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

      {/* Section 1: Active Tenants */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">
          {t("tenants.activeTenants")} {activeTenants && activeTenants.length > 0 && `(${activeTenants.length})`}
        </h3>
        {activeTenants && activeTenants.length > 0 ? (
          <div className="space-y-3">
            {activeTenants.map((tenant) => (
              <div key={tenant.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Tenant Avatar with KYC Badge */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarUrls[tenant.tenant_id]} alt={getTenantName(tenant)} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getTenantInitials(tenant)}
                        </AvatarFallback>
                      </Avatar>
                      {tenant.kyc_status === 'verified' && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                          <BadgeCheck className="h-4 w-4 text-blue-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0",
                            tenant.tenancy_status === "active" ? "bg-green-500" : "bg-yellow-500"
                          )}
                        />
                        <p className="font-medium truncate">{getTenantName(tenant)}</p>
                        {tenant.tenancy_status === 'ending_tenancy' && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
                            {t("tenants.endingTenancy")}
                          </Badge>
                        )}
                        {tenant.kyc_status === 'verified' && (
                          <span className="text-xs text-blue-500 font-medium hidden sm:inline">
                            {t("tenants.kycVerified")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("properties.tenancyStarted")}: {formatDate(tenant.started_at)}
                      </p>
                      {tenant.tenancy_status === 'ending_tenancy' && tenant.planned_ending_date && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {t("tenants.plannedEndDate")}: {formatDate(tenant.planned_ending_date)}
                        </p>
                      )}
                      {tenant.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{tenant.notes}</p>
                      )}
                    </div>
                  </div>
                  {userRole?.isManager && !isReadOnly && (
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setEditingTenant(tenant)} disabled={isReadOnly}>
                        {t("common.edit")}
                      </Button>
                      {tenant.tenancy_status === 'ending_tenancy' ? (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setRemovingTenant(tenant)} 
                          disabled={isReadOnly}
                        >
                          {t("dialogs.manageTenants.finalize")}
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onEndTenancy?.(tenant)} 
                          disabled={isReadOnly}
                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                        >
                          {t("dialogs.manageTenants.endTenancy")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("dialogs.manageTenants.noTenants")}</p>
        )}
      </div>

      {/* Section 2: Pending Invitations (Manager Only) */}
      {userRole?.isManager && invitations && invitations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              {t("dialogs.manageTenants.pendingInvitations")} ({invitations.length})
            </h3>
            <div className="space-y-2">
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
          </div>
        </>
      )}

      {/* Section 4: Tenancy History (Manager Only) */}
      {userRole?.isManager && tenancyHistory && tenancyHistory.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t("properties.tenancyHistory")}</h3>
            <div className="space-y-2">
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
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" onClick={() => openDocument(doc)} title={t("common.open")}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)} title={t("common.download")}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
