import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dateUtils";
import {
  Banknote,
  Shield,
  Calendar,
  CalendarDays,
  FileSignature,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";

interface RentalTermsSummaryProps {
  propertyId: string;
  tenancyId: string | undefined;
  tenantEmail?: string;
}

export function RentalTermsSummary({ propertyId, tenancyId, tenantEmail }: RentalTermsSummaryProps) {
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

  // Merge data - rent_agreement takes priority
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
  
  // Parse utilities config
  const utilitiesConfig = tenancyRequirements?.utilities_config as Record<string, string> | null;

  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents) return "—";
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    return formatter.format(cents / 100);
  };

  const getContractMethodLabel = (method: string | null | undefined) => {
    switch (method) {
      case "yousign":
        return t("tenancy.wizard.yousignLabel") || "Qualified Digital Signature (EU)";
      case "docuseal":
        return t("tenancy.wizard.docusealLabel") || "Advanced Digital Signature";
      case "manual":
        return t("tenancy.wizard.manualLabel") || "Manual/Paper";
      default:
        return "—";
    }
  };

  // Count utilities
  const tenantUtilities: string[] = [];
  const managerUtilities: string[] = [];
  const utilityLabels: Record<string, string> = {
    electricity: t("tenancy.wizard.utilities.electricity") || "Electricity",
    gas: t("tenancy.wizard.utilities.gas") || "Gas",
    water: t("tenancy.wizard.utilities.water") || "Water",
    internet: t("tenancy.wizard.utilities.internet") || "Internet",
    heating: t("tenancy.wizard.utilities.heating") || "Heating",
    trash: t("tenancy.wizard.utilities.trash") || "Trash",
  };

  if (utilitiesConfig) {
    Object.entries(utilitiesConfig).forEach(([key, value]) => {
      const label = utilityLabels[key] || key;
      if (value === "tenant") tenantUtilities.push(label);
      else if (value === "manager") managerUtilities.push(label);
    });
  }

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

  // Don't show if no data
  if (!rentAmountCents && !tenancyRequirements) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          {t("contracts.rentalTerms") || "Rental Terms"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Terms */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Banknote className="h-3 w-3" />
              {t("tenancy.wizard.monthlyRent") || "Monthly Rent"}
            </div>
            <p className="font-semibold">{formatCurrency(rentAmountCents)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              {t("tenancy.wizard.securityDeposit") || "Security Deposit"}
            </div>
            <p className="font-semibold">{formatCurrency(depositCents)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t("tenancy.wizard.paymentDay") || "Payment Day"}
            </div>
            <p className="font-semibold">{paymentDay ? `Day ${paymentDay}` : "—"}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {t("tenancy.wizard.leaseDates") || "Lease Dates"}
            </div>
            <p className="font-semibold text-sm">
              {startDate ? formatDate(startDate) : "—"}{" "}
              {endDate ? `→ ${formatDate(endDate)}` : ""}
            </p>
          </div>
        </div>

        {/* Contract Method */}
        {contractMethod && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("tenancy.wizard.contractMethod") || "Contract Signing"}:</span>
              <Badge variant="secondary">{getContractMethodLabel(contractMethod)}</Badge>
            </div>
          </div>
        )}

        {/* Verification Requirements */}
        {(requireEmailVerification !== undefined || requireKycVerification !== undefined || requirePhoneVerification !== undefined) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">{t("tenancy.wizard.verificationRequirements") || "Verification Requirements"}</p>
            <div className="flex flex-wrap gap-2">
              {requireEmailVerification !== undefined && (
                <Badge variant={requireEmailVerification ? "default" : "outline"} className="text-xs">
                  {requireEmailVerification ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {t("tenancy.wizard.emailVerification") || "Email"}
                </Badge>
              )}
              {requireKycVerification !== undefined && (
                <Badge variant={requireKycVerification ? "default" : "outline"} className="text-xs">
                  {requireKycVerification ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {t("tenancy.wizard.kycVerification") || "Identity"}
                </Badge>
              )}
              {requirePhoneVerification !== undefined && (
                <Badge variant={requirePhoneVerification ? "default" : "outline"} className="text-xs">
                  {requirePhoneVerification ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {t("tenancy.wizard.phoneVerification") || "Phone"}
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
              {t("tenancy.wizard.utilitiesResponsibilities") || "Utilities Responsibilities"}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {tenantUtilities.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t("tenancy.wizard.tenantPays") || "Tenant pays"}:</p>
                  <p className="text-sm">{tenantUtilities.join(", ")}</p>
                </div>
              )}
              {managerUtilities.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t("tenancy.wizard.managerPays") || "Manager pays"}:</p>
                  <p className="text-sm">{managerUtilities.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
