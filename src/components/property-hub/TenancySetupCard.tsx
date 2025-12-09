import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { TenancyRequirement, UtilitiesConfig } from "@/hooks/useTenancyRequirements";
import { 
  Plus, 
  Mail, 
  Send, 
  X,
  Banknote, 
  Shield, 
  Calendar, 
  FileText,
  Zap,
  CheckCircle2,
  Phone,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface TenancySetupCardProps {
  pendingRequirement: TenancyRequirement | null;
  canSetupNewTenancy: boolean;
  hasEndingTenancy: boolean;
  onStartSetup: () => void;
  onSendInvitation: (req: TenancyRequirement) => void;
  onCancelSetup: (req: TenancyRequirement) => void;
  isDeleting?: boolean;
}

const getUtilitiesSummary = (config: UtilitiesConfig | null) => {
  if (!config) return { tenantPays: 0, managerPays: 0 };
  const tenantPays = Object.values(config).filter(v => v === 'tenant_pays').length;
  const managerPays = Object.values(config).filter(v => v === 'manager_pays').length;
  return { tenantPays, managerPays };
};

const formatCurrency = (cents: number | null, currency: string = 'EUR') => {
  if (!cents) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
};

const getContractMethodLabel = (method: string | null) => {
  switch (method) {
    case 'docuseal': return 'Digital Signature';
    case 'yousign': return 'Qualified Signature (EU)';
    case 'manual': return 'Manual';
    case 'none': return 'No Contract';
    default: return '-';
  }
};

export function TenancySetupCard({
  pendingRequirement,
  canSetupNewTenancy,
  hasEndingTenancy,
  onStartSetup,
  onSendInvitation,
  onCancelSetup,
  isDeleting
}: TenancySetupCardProps) {
  const { t } = useLanguage();

  // Don't show card if can't setup and no pending requirement
  if (!canSetupNewTenancy && !pendingRequirement) {
    return null;
  }

  const isDraft = pendingRequirement?.status === 'draft';
  const isSent = pendingRequirement?.status === 'sent';
  const utilities = getUtilitiesSummary(pendingRequirement?.utilities_config as UtilitiesConfig);

  // Determine card styling based on state
  const getCardStyles = () => {
    if (!pendingRequirement) {
      return hasEndingTenancy 
        ? "border-amber-500/50 bg-amber-500/5" 
        : "border-primary/50 bg-primary/5";
    }
    if (isDraft) return "border-amber-500/50 bg-amber-500/5";
    if (isSent) return "border-blue-500/50 bg-blue-500/5";
    return "";
  };

  const getHeaderIcon = () => {
    if (!pendingRequirement) return <Plus className="h-5 w-5" />;
    if (isDraft) return <FileText className="h-5 w-5 text-amber-600" />;
    if (isSent) return <Mail className="h-5 w-5 text-blue-600" />;
    return null;
  };

  return (
    <Card className={`animate-fade-in ${getCardStyles()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getHeaderIcon()}
            <CardTitle className="text-base">
              {t("tenancy.wizard.tenancySetup") || "Tenancy Setup"}
            </CardTitle>
          </div>
          {pendingRequirement && (
            <Badge variant={isDraft ? "outline" : "secondary"} className={
              isDraft ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30" :
              isSent ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30" : ""
            }>
              {isDraft ? t("common.draft") || "Draft" : t("common.sent") || "Sent"}
            </Badge>
          )}
        </div>
        {!pendingRequirement && (
          <CardDescription>
            {hasEndingTenancy 
              ? t("properties.canSetupNewTenantParallel") || "Current tenancy is ending. Set up next tenant now."
              : t("properties.inviteTenantToGetStarted") || "This property has no tenant. Start by setting up a new tenancy."
            }
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Empty state - show CTA */}
        {!pendingRequirement && (
          <Button onClick={onStartSetup} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {t("tenancy.wizard.newTenancy") || "New Tenancy Setup"}
          </Button>
        )}

        {/* Pending requirement - show details */}
        {pendingRequirement && (
          <>
            {/* Tenant email */}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{pendingRequirement.tenant_email}</span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Rent */}
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("rent.amount") || "Rent"}: </span>
                  <span className="font-medium">
                    {formatCurrency(pendingRequirement.rent_amount_cents, pendingRequirement.currency || 'EUR')}
                  </span>
                </div>
              </div>

              {/* Security Deposit */}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("rent.deposit") || "Deposit"}: </span>
                  <span className="font-medium">
                    {formatCurrency(pendingRequirement.security_deposit_cents, pendingRequirement.currency || 'EUR')}
                  </span>
                </div>
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("tenancy.startDate") || "Start"}: </span>
                  <span className="font-medium">
                    {pendingRequirement.start_date 
                      ? format(new Date(pendingRequirement.start_date), 'MMM d, yyyy')
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Payment Day */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("rent.paymentDay") || "Payment Day"}: </span>
                  <span className="font-medium">
                    {pendingRequirement.payment_day ? `Day ${pendingRequirement.payment_day}` : '-'}
                  </span>
                </div>
              </div>

              {/* Contract Method */}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("contracts.method") || "Contract"}: </span>
                  <span className="font-medium">{getContractMethodLabel(pendingRequirement.contract_method)}</span>
                </div>
              </div>

              {/* Utilities */}
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">{t("utilities.title") || "Utilities"}: </span>
                  <span className="font-medium">
                    {utilities.tenantPays > 0 && `${utilities.tenantPays} tenant`}
                    {utilities.tenantPays > 0 && utilities.managerPays > 0 && ', '}
                    {utilities.managerPays > 0 && `${utilities.managerPays} manager`}
                    {utilities.tenantPays === 0 && utilities.managerPays === 0 && '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Requirements */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-muted-foreground">{t("tenancy.verification") || "Verification"}:</span>
              <div className="flex items-center gap-2">
                {pendingRequirement.require_email_verification && (
                  <div className="flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3 text-primary" />
                    <span>Email</span>
                  </div>
                )}
                {pendingRequirement.require_kyc_verification && (
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    <span>KYC</span>
                  </div>
                )}
                {pendingRequirement.require_phone_verification && (
                  <div className="flex items-center gap-1 text-xs">
                    <Phone className="h-3 w-3 text-primary" />
                    <span>Phone</span>
                  </div>
                )}
                {!pendingRequirement.require_email_verification && 
                 !pendingRequirement.require_kyc_verification && 
                 !pendingRequirement.require_phone_verification && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>

            {/* Created date */}
            {pendingRequirement.created_at && (
              <p className="text-xs text-muted-foreground">
                {t("common.created") || "Created"}: {format(new Date(pendingRequirement.created_at), 'MMM d, yyyy HH:mm')}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              {isDraft && (
                <Button 
                  size="sm" 
                  onClick={() => onSendInvitation(pendingRequirement)}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t("tenancy.sendInvitation") || "Send Invitation"}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancelSetup(pendingRequirement)}
                disabled={isDeleting}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
                {t("common.cancel") || "Cancel"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
