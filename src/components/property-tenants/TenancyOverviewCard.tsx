import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { profileService, tenancyService } from "@/services";
import { formatDate } from "@/lib/dateUtils";
import { TenancyRequirement } from "@/hooks/useTenancyRequirements";
import { 
  User, Mail, FileSignature, CheckCircle, Zap, Pencil, Send, FileText, Settings
} from "lucide-react";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface TenancyOverviewCardProps {
  propertyId: string;
  currentTenant: Tenant | null;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  tenancyId?: string;
  tenancyStatus?: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  pendingRequirement?: TenancyRequirement | null;
  canSetupNewTenancy?: boolean;
  onStartSetup?: () => void;
  onSendInvitation?: () => void;
  onEdit?: () => void;
}

const formatCurrency = (cents: number | null | undefined, currency: string = 'EUR') => {
  if (!cents) return "—";
  const symbols: Record<string, string> = { eur: "€", usd: "$", gbp: "£" };
  return `${symbols[currency] || currency} ${(cents / 100).toFixed(0)}`;
};

const getContractMethodLabel = (method: string | null | undefined, t: (key: string) => string) => {
  switch (method) {
    case "digital": return t("tenancy.wizard.digitalSignature");
    case "manual": return t("tenancy.wizard.manualSignature");
    case "none": return t("tenancy.wizard.skipContract");
    default: return "—";
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "outline"; className: string; label: string }> = {
    active: { variant: "default", className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10", label: "Active" },
    ending_tenancy: { variant: "default", className: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10", label: "Ending" },
    pending: { variant: "default", className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10", label: "Pending" },
    historic: { variant: "secondary", className: "text-gray-600", label: "Historic" },
  };
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} className={`text-xs font-medium px-2.5 py-1 h-auto border ${config.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </Badge>
  );
};

interface RequirementBadgeProps {
  type: 'contract' | 'email' | 'kyc' | 'phone';
  label: string;
}

const RequirementBadge = ({ type, label }: RequirementBadgeProps) => {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    contract: { className: "bg-muted text-muted-foreground border-muted", icon: <FileSignature className="h-3 w-3 mr-1" /> },
    email: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    kyc: { className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    phone: { className: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/10", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
  };
  const { className, icon } = config[type];
  return (
    <Badge variant="default" className={`text-xs font-medium px-2.5 py-1 h-auto border ${className}`}>
      {icon}
      {label}
    </Badge>
  );
};

interface StateBadgeProps {
  state: 'draft' | 'sent' | 'locked';
}

const StateBadge = ({ state }: StateBadgeProps) => {
  const config: Record<string, { className: string; label: string }> = {
    draft: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Draft" },
    sent: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Sent" },
    locked: { className: "bg-green-500/10 text-green-600 border-green-500/20", label: "Locked" },
  };
  const { className, label } = config[state];
  return (
    <Badge variant="default" className={`text-xs font-medium px-2.5 py-1 h-auto border ${className}`}>
      {label}
    </Badge>
  );
};

export function TenancyOverviewCard({
  propertyId,
  currentTenant,
  userRole,
  isReadOnly,
  tenancyId,
  tenancyStatus,
  pendingRequirement,
  canSetupNewTenancy,
  onStartSetup,
  onSendInvitation,
  onEdit,
}: TenancyOverviewCardProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager;
  const isDraft = pendingRequirement?.status === 'draft';
  const isSent = pendingRequirement?.status === 'sent';
  const showPendingSetup = isManager && !isReadOnly && pendingRequirement;
  const showSetupButton = isManager && !isReadOnly && canSetupNewTenancy && !pendingRequirement;
  
  // Fetch manager info using profileService
  const { data: managerInfo } = useQuery({
    queryKey: ["property-manager", propertyId],
    queryFn: async () => {
      const managerId = await tenancyService.getPropertyManagerId(propertyId);
      if (!managerId) return null;
      const profile = await profileService.getProfile(managerId);
      return profile ? {
        id: profile.id,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        avatar_url: profile.avatarStoragePath,
      } : null;
    },
    enabled: !!propertyId,
  });

  // Fetch rent agreement
  const { data: rentAgreement } = useQuery({
    queryKey: ["rent-agreement-summary", propertyId, tenancyId],
    queryFn: async () => {
      if (!tenancyId) return null;
      return tenancyService.getActiveRentAgreement(tenancyId);
    },
    enabled: !!tenancyId,
  });

  // Fetch tenancy requirements as fallback
  const { data: tenancyRequirements } = useQuery({
    queryKey: ["tenancy-requirements-summary", propertyId, tenancyId],
    queryFn: async () => {
      if (!tenancyId) return null;
      const { data, error } = await supabase
        .from("tenancy_requirements")
        .select("*")
        .eq("tenancy_id", tenancyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenancyId,
  });

  const hasRentalData = !!rentAgreement || !!tenancyRequirements;

  // Extract data from rent agreement or tenancy requirements
  const rentAmountCents = rentAgreement?.rent_amount_cents || tenancyRequirements?.rent_amount_cents;
  const depositCents = rentAgreement?.security_deposit_cents || tenancyRequirements?.security_deposit_cents;
  const currency = rentAgreement?.currency || tenancyRequirements?.currency || 'EUR';
  const paymentDay = rentAgreement?.payment_day || tenancyRequirements?.payment_day;
  const startDate = rentAgreement?.start_date || tenancyRequirements?.start_date;
  const endDate = rentAgreement?.end_date || tenancyRequirements?.end_date;
  const contractMethod = tenancyRequirements?.contract_method;
  const requireEmailVerification = tenancyRequirements?.require_email_verification;
  const requireKycVerification = tenancyRequirements?.require_kyc_verification;
  const requirePhoneVerification = tenancyRequirements?.require_phone_verification;
  const utilitiesConfig = tenancyRequirements?.utilities_config as Record<string, string> | null;

  // Utilities breakdown
  const utilityLabels: Record<string, string> = {
    electricity: t("tenancy.wizard.utilities.electricity"),
    gas: t("tenancy.wizard.utilities.gas"),
    water: t("tenancy.wizard.utilities.water"),
    internet: t("tenancy.wizard.utilities.internet"),
    heating: t("tenancy.wizard.utilities.heating"),
    trash: t("tenancy.wizard.utilities.trash"),
  };

  const tenantUtilities: string[] = [];
  const managerUtilities: string[] = [];
  if (utilitiesConfig) {
    Object.entries(utilitiesConfig).forEach(([key, value]) => {
      const label = utilityLabels[key] || key;
      if (value === "tenant" || value === "tenant_pays") tenantUtilities.push(label);
      else if (value === "manager" || value === "manager_pays") managerUtilities.push(label);
    });
  }

  const tenantName = currentTenant?.first_name && currentTenant?.last_name
    ? `${currentTenant.first_name} ${currentTenant.last_name}`
    : currentTenant?.first_name || currentTenant?.email || "—";

  // Card styling based on state
  const getCardStyles = () => {
    if (showPendingSetup) {
      if (isDraft) return "border-amber-500/50 bg-amber-500/5";
      if (isSent) return "border-blue-500/50 bg-blue-500/5";
    }
    return "";
  };

  const showLoading = userRole === undefined;
  if (showLoading) {
    return (
      <Card className="card-shine">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {/* PENDING SETUP VIEW - Keep as single card */}
      {showPendingSetup && pendingRequirement && (
        <Card className={`card-shine`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("tenancy.wizard.title")}
              </CardTitle>

            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.monthlyRent")}</span>
                <span className="font-medium">{formatCurrency(pendingRequirement.rent_amount_cents, pendingRequirement.currency)}</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.securityDeposit")}</span>
                <span className="font-medium">{formatCurrency(pendingRequirement.security_deposit_cents, pendingRequirement.currency)}</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.paymentDay")}</span>
                <span className="font-medium">{pendingRequirement.payment_day ? `Day ${pendingRequirement.payment_day}` : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SETUP BUTTON (when no data exists) */}
      {showSetupButton && (
        <Card className="card-shine">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">{t("tenancy.setupTenancy")}</p>
              <Button className="h-9" onClick={onStartSetup}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("tenancy.setupTenancy")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RENTAL TERMS VIEW - Combined into single card */}
      {!showPendingSetup && hasRentalData && (
        <Card className="card-shine">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("propertyTenants.tenantInfo") || "Tenancy Overview"}
              </CardTitle>
              {currentTenant && <StatusBadge status={currentTenant.tenancy_status} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tenant Info Section */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar className="h-12 w-12 ring-2 ring-muted">
                <AvatarImage src={currentTenant?.avatar_url || managerInfo?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{tenantName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {currentTenant?.email || "—"}
                </div>
              </div>
              {!isManager && managerInfo && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t("propertyHub.propertyManager")}</p>
                  <p className="font-medium text-sm">{managerInfo.first_name || managerInfo.email}</p>
                </div>
              )}
            </div>

            {/* Rental Terms Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.monthlyRent")}</span>
                <p className="font-semibold text-blue-600">{formatCurrency(rentAmountCents, currency)}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.securityDeposit")}</span>
                <p className="font-semibold text-green-600">{formatCurrency(depositCents, currency)}</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.paymentDay")}</span>
                <p className="font-semibold">{paymentDay ? `Day ${paymentDay}` : "—"}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <span className="text-xs text-muted-foreground block">{t("tenancy.wizard.leaseDates")}</span>
                <p className="font-semibold text-sm">
                  {startDate ? formatDate(startDate) : "—"}{" "}
                  {endDate ? `→ ${formatDate(endDate)}` : ""}
                </p>
              </div>
            </div>

            {/* Requirements & Utilities */}
            {(contractMethod || requireEmailVerification !== undefined || requireKycVerification !== undefined || requirePhoneVerification !== undefined || tenantUtilities.length > 0 || managerUtilities.length > 0) && (
              <div className="pt-4 border-t space-y-4">
                {/* Requirements badges */}
                <div className="flex flex-wrap gap-2">
                  {contractMethod && (
                    <RequirementBadge type="contract" label={getContractMethodLabel(contractMethod, t)} />
                  )}
                  {requireEmailVerification && (
                    <RequirementBadge type="email" label={t("verification.email")} />
                  )}
                  {requireKycVerification && (
                    <RequirementBadge type="kyc" label={t("verification.kyc")} />
                  )}
                  {requirePhoneVerification && (
                    <RequirementBadge type="phone" label={t("verification.phone")} />
                  )}
                </div>

                {/* Utilities */}
                {(tenantUtilities.length > 0 || managerUtilities.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    {tenantUtilities.length > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">{t("tenancy.wizard.tenantPays")}:</span>
                          <p className="text-sm">{tenantUtilities.join(", ")}</p>
                        </div>
                      </div>
                    )}
                    {managerUtilities.length > 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block">{t("tenancy.wizard.managerPays")}:</span>
                          <p className="text-sm">{managerUtilities.join(", ")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit Button */}
            <div className="flex justify-end pt-2">
              {onEdit && !isReadOnly && tenancyStatus === 'active' && (
                <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {t("common.edit")}
                </Button>
              )}
              {onEdit && !isReadOnly && tenancyStatus === 'ending_tenancy' && (
                <Button variant="outline" size="sm" className="h-8" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {t("tenancy.setUpNextTenancy")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!showPendingSetup && !hasRentalData && !showSetupButton && (
        <Card className="card-shine">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t("rentAgreements.noAgreements")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TenancyOverviewCard;
