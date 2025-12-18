import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dateUtils";
import { TenancyRequirement, UtilitiesConfig } from "@/hooks/useTenancyRequirements";
import {
  Receipt,
  Shield,
  Calendar,
  CalendarDays,
  FileSignature,
  CheckCircle,
  XCircle,
  Zap,
  Plus,
  Mail,
  Send,
  X,
  FileText,
  Clock,
  Phone,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { format } from "date-fns";

interface RentalTermsCardProps {
  propertyId: string;
  tenancyId: string | undefined;
  tenantEmail?: string;
  // Manager-only props
  isManager: boolean;
  isReadOnly: boolean;
  pendingRequirement: TenancyRequirement | null;
  canSetupNewTenancy: boolean;
  hasEndingTenancy: boolean;
  currentTenantName?: string;
  onStartSetup?: () => void;
  onSendInvitation?: (req: TenancyRequirement) => void;
  onCancelSetup?: (req: TenancyRequirement) => void;
  onResendInvitation?: (req: TenancyRequirement) => void;
  isDeleting?: boolean;
  isResending?: boolean;
}

const formatCurrency = (cents: number | null | undefined, currency: string = 'EUR') => {
  if (!cents) return "—";
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  return formatter.format(cents / 100);
};

const getContractMethodLabel = (method: string | null | undefined, t: (key: string) => string) => {
  switch (method) {
    case "digital":
      return t("tenancy.wizard.digitalSignature");
    case "manual":
      return t("tenancy.wizard.manualSignature");
    case "none":
      return t("tenancy.wizard.skipContract");
    default:
      return "—";
  }
};

const getUtilitiesSummary = (config: UtilitiesConfig | null) => {
  if (!config) return { tenantPays: 0, managerPays: 0 };
  const tenantPays = Object.values(config).filter(v => v === 'tenant_pays' || v === 'tenant').length;
  const managerPays = Object.values(config).filter(v => v === 'manager_pays' || v === 'manager').length;
  return { tenantPays, managerPays };
};

export function RentalTermsCard({
  propertyId,
  tenancyId,
  tenantEmail,
  isManager,
  isReadOnly,
  pendingRequirement,
  canSetupNewTenancy,
  hasEndingTenancy,
  currentTenantName,
  onStartSetup,
  onSendInvitation,
  onCancelSetup,
  onResendInvitation,
  isDeleting,
  isResending,
}: RentalTermsCardProps) {
  const { t } = useLanguage();

  // Fetch rent agreement
  const { data: rentAgreement, isLoading: agreementLoading } = useQuery({
    queryKey: ["rent-agreement-summary", propertyId, tenancyId],
    queryFn: async () => {
      if (!tenancyId) return null;
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("*")
        .eq("tenancy_id", tenancyId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenancyId,
  });

  // Fetch tenancy requirements as fallback
  const { data: tenancyRequirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ["tenancy-requirements-summary", propertyId, tenancyId, tenantEmail],
    queryFn: async () => {
      // First try by tenancy_id
      if (tenancyId) {
        const { data, error } = await supabase
          .from("tenancy_requirements")
          .select("*")
          .eq("tenancy_id", tenancyId)
          .maybeSingle();
        if (!error && data) return data;
      }
      
      // Fallback to tenant_email
      if (tenantEmail) {
        const { data, error } = await supabase
          .from("tenancy_requirements")
          .select("*")
          .eq("property_id", propertyId)
          .eq("tenant_email", tenantEmail)
          .in("status", ["accepted", "sent"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) return data;
      }
      
      return null;
    },
    enabled: !!tenancyId || !!tenantEmail,
  });

  const isLoading = agreementLoading || requirementsLoading;

  // Determine what to show
  const hasRentalData = rentAgreement || tenancyRequirements;
  const isDraft = pendingRequirement?.status === 'draft';
  const isSent = pendingRequirement?.status === 'sent';
  const showPendingSetup = isManager && !isReadOnly && pendingRequirement;
  const showSetupButton = isManager && !isReadOnly && canSetupNewTenancy && !pendingRequirement;

  // Extract rental data
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

  // Card styling based on state
  const getCardStyles = () => {
    if (showPendingSetup) {
      if (isDraft) return "border-amber-500/50 bg-amber-500/5";
      if (isSent) return "border-blue-500/50 bg-blue-500/5";
    }
    return "";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`card-shine ${getCardStyles()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {showPendingSetup 
              ? t("tenancy.wizard.tenancySetup")
              : t("contracts.rentalTerms")
            }
          </CardTitle>
          <div className="flex items-center gap-2">
            {showPendingSetup && (
              <Badge variant={isDraft ? "outline" : "secondary"} className={
                isDraft ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30" :
                isSent ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30" : ""
              }>
                {isDraft ? t("common.draft") : t("common.sent")}
              </Badge>
            )}
          </div>
        </div>
        {/* Subtitle showing current tenant status for managers */}
        {isManager && currentTenantName && !showPendingSetup && (
          <p className="text-sm text-muted-foreground">
            {hasEndingTenancy 
              ? `${t("tenants.currentTenant")}: ${currentTenantName} (${t("tenants.endingTenancy")})`
              : `${t("tenants.currentTenant")}: ${currentTenantName}`
            }
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* PENDING SETUP VIEW */}
        {showPendingSetup && pendingRequirement && (
          <>
            {/* Tenant email */}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{pendingRequirement.tenant_email}</span>
            </div>

            {/* Details grid - condensed */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {formatCurrency(pendingRequirement.rent_amount_cents, pendingRequirement.currency || 'EUR')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {formatCurrency(pendingRequirement.security_deposit_cents, pendingRequirement.currency || 'EUR')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {pendingRequirement.payment_day ? `Day ${pendingRequirement.payment_day}` : '-'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {pendingRequirement.start_date 
                    ? format(new Date(pendingRequirement.start_date), 'MMM d, yyyy')
                    : '-'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">
                  {(() => {
                    const utils = getUtilitiesSummary(pendingRequirement.utilities_config as UtilitiesConfig);
                    if (utils.tenantPays === 0 && utils.managerPays === 0) return '-';
                    const parts = [];
                    if (utils.tenantPays > 0) parts.push(`${utils.tenantPays} tenant`);
                    if (utils.managerPays > 0) parts.push(`${utils.managerPays} manager`);
                    return parts.join(', ');
                  })()}
                </span>
              </div>
            </div>

            {/* Requirements (Contract + Verification) - Combined */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">{t("tenancy.wizard.requirements")}:</span>
              {pendingRequirement.contract_method && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {getContractMethodLabel(pendingRequirement.contract_method, t)}
                </Badge>
              )}
              {pendingRequirement.require_email_verification && (
                <Badge variant="outline" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  {t("verification.email")}
                </Badge>
              )}
              {pendingRequirement.require_kyc_verification && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t("verification.kyc")}
                </Badge>
              )}
              {pendingRequirement.require_phone_verification && (
                <Badge variant="outline" className="text-xs">
                  <Phone className="h-3 w-3 mr-1" />
                  {t("verification.phone")}
                </Badge>
              )}
              {!pendingRequirement.contract_method && 
               !pendingRequirement.require_email_verification && 
               !pendingRequirement.require_kyc_verification && 
               !pendingRequirement.require_phone_verification && (
                <span className="text-xs text-muted-foreground">{t("common.none")}</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              {isDraft && onSendInvitation && (
                <Button 
                  size="sm" 
                  onClick={() => onSendInvitation(pendingRequirement)}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t("tenancy.sendInvitation")}
                </Button>
              )}
              {isSent && onResendInvitation && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onResendInvitation(pendingRequirement)}
                  disabled={isResending}
                  className="gap-2"
                >
                  <RefreshCcw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                  {t("tenancy.resendInvitation")}
                </Button>
              )}
              {onCancelSetup && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancelSetup(pendingRequirement)}
                  disabled={isDeleting}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          </>
        )}

        {/* RENTAL TERMS VIEW */}
        {!showPendingSetup && hasRentalData && (
          <>
            {/* Financial Terms */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Receipt className="h-3 w-3" />
                  {t("tenancy.wizard.monthlyRent")}
                </div>
                <p className="font-semibold">{formatCurrency(rentAmountCents, currency)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {t("tenancy.wizard.securityDeposit")}
                </div>
                <p className="font-semibold">{formatCurrency(depositCents, currency)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {t("tenancy.wizard.paymentDay")}
                </div>
                <p className="font-semibold">{paymentDay ? `${t("rent.dayOfMonth")} ${paymentDay}` : "—"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {t("tenancy.wizard.leaseDates")}
                </div>
                <p className="font-semibold text-sm">
                  {startDate ? formatDate(startDate) : "—"}{" "}
                  {endDate ? `→ ${formatDate(endDate)}` : ""}
                </p>
              </div>
            </div>

            {/* Requirements (Contract + Verification) - Combined */}
            {(contractMethod || requireEmailVerification !== undefined || requireKycVerification !== undefined || requirePhoneVerification !== undefined) && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t("tenancy.wizard.requirements")}</p>
                <div className="flex flex-wrap gap-2">
                  {contractMethod && (
                    <Badge variant="secondary" className="text-xs">
                      <FileSignature className="h-3 w-3 mr-1" />
                      {getContractMethodLabel(contractMethod, t)}
                    </Badge>
                  )}
                  {requireEmailVerification && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("verification.email")}
                    </Badge>
                  )}
                  {requireKycVerification && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("verification.kyc")}
                    </Badge>
                  )}
                  {requirePhoneVerification && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("verification.phone")}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Utilities Responsibilities */}
            {(tenantUtilities.length > 0 || managerUtilities.length > 0) && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Zap className="h-3 w-3" />
                  {t("tenancy.wizard.utilitiesResponsibilities")}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {tenantUtilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t("tenancy.wizard.tenantPays")}:</p>
                      <p className="text-sm">{tenantUtilities.join(", ")}</p>
                    </div>
                  )}
                  {managerUtilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t("tenancy.wizard.managerPays")}:</p>
                      <p className="text-sm">{managerUtilities.join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* EMPTY STATE */}
        {!showPendingSetup && !hasRentalData && (
          <div className="flex flex-col items-center justify-center py-8">
            {isManager && canSetupNewTenancy && onStartSetup ? (
      <Button 
        variant="default"
        size="lg"
        onClick={onStartSetup}
        className="h-16 sm:h-20 px-8 sm:px-12 text-base sm:text-lg gap-2"
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
        {t("tenancy.wizard.newTenancy")}
      </Button>
            ) : (
              <>
                <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">{t("contracts.noRentalTerms")}</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}