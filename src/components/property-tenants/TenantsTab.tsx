import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail,
  X,
  Clock,
  ChevronDown,
  Download,
  AlertTriangle,
  Eye,
  BadgeCheck,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { CreateTenancyWizard } from "@/components/CreateTenancyWizard";
import { useTenancyRequirements, CreateTenancyRequirementInput } from "@/hooks/useTenancyRequirements";
import { toast } from "sonner";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
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
  activeTenants: Tenant[] | undefined;
  invitations: Invitation[] | undefined;
  tenancyHistory: Tenant[] | undefined;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  email: string;
  setEmail: (email: string) => void;
  showInviteForm: boolean;
  setShowInviteForm: (show: boolean) => void;
  setRemovingTenant: (tenant: Tenant | null) => void;
  setEditingTenant: (tenant: Tenant | null) => void;
  setCancellingInvitation: (invitation: Invitation | null) => void;
  onInviteTenant: (email: string) => void;
  invitePending: boolean;
  currentTenant: Tenant | null;
  propertyCount: number | undefined;
  maxPropertiesLimit: number;
  tenancyDocsMap: Record<string, TenancyDocument[]>;
  expandedTenancyId: string | null;
  setExpandedTenancyId: (id: string | null) => void;
  loadTenancyDocuments: (tenancyId: string) => Promise<void>;
  downloadDocument: (doc: TenancyDocument) => Promise<void>;
  openDocument?: (doc: TenancyDocument) => Promise<void>;
  propertyId: string;
  propertyCountry?: string;
  templates?: Array<{ id: string; document_title: string }>;
}

export function TenantsTab({
  activeTenants,
  invitations,
  tenancyHistory,
  userRole,
  isReadOnly,
  email,
  setEmail,
  showInviteForm,
  setShowInviteForm,
  setRemovingTenant,
  setEditingTenant,
  setCancellingInvitation,
  onInviteTenant,
  invitePending,
  currentTenant,
  propertyCount,
  maxPropertiesLimit,
  tenancyDocsMap,
  expandedTenancyId,
  setExpandedTenancyId,
  loadTenancyDocuments,
  downloadDocument,
  openDocument,
  propertyId,
  propertyCountry,
  templates = [],
}: TenantsTabProps) {
  const { t } = useLanguage();
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [showWizard, setShowWizard] = useState(false);
  
  const { createRequirement } = useTenancyRequirements(propertyId);

  const handleWizardSubmit = async (data: CreateTenancyRequirementInput) => {
    try {
      const requirement = await createRequirement.mutateAsync(data);
      // After creating requirement, also send the invitation
      onInviteTenant(data.tenant_email);
      toast.success(t('tenancy.wizard.invitationSent') || 'Invitation sent successfully');
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

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

  return (
    <div className="space-y-6">
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
                          onClick={() => setRemovingTenant(tenant)} 
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
        
        {/* Invite New Tenant - Prominent when no tenants */}
        {userRole?.isManager && !isReadOnly && !currentTenant && (
          <Alert className="border-primary/50 bg-primary/5 mt-4">
            <Plus className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">{t("properties.noTenantsYet")}</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-3">{t("properties.inviteTenantToGetStarted")}</p>
              <Button
                variant="default"
                onClick={() => setShowWizard(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("tenancy.wizard.newTenancy") || "New Tenancy Setup"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Invite Additional Tenant Button */}
        {userRole?.isManager && !isReadOnly && currentTenant && (
          <Button
            variant="outline"
            onClick={() => setShowWizard(true)}
            className="w-full mt-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("tenancy.wizard.newTenancy") || "New Tenancy Setup"}
          </Button>
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
                                  {openDocument && (
                                    <Button variant="outline" size="sm" onClick={() => openDocument(doc)} title={t("common.open")}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
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

      {/* Tenancy Setup Wizard */}
      <CreateTenancyWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        propertyId={propertyId}
        propertyCountry={propertyCountry}
        templates={templates}
        onSubmit={handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
      />
    </div>
  );
}
