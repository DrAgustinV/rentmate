import { format } from "date-fns";
import { TenancyRequirement, UtilitiesConfig } from "@/hooks/useTenancyRequirements";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Send, 
  X, 
  Calendar, 
  Banknote, 
  Shield, 
  FileText, 
  Zap,
  CheckCircle2,
  Phone,
  Clock
} from "lucide-react";

interface PendingTenancySetupCardProps {
  requirement: TenancyRequirement;
  onSendInvitation: (requirement: TenancyRequirement) => void;
  onCancelSetup: (requirement: TenancyRequirement) => void;
  isDeleting?: boolean;
}

// Helper to count utilities by responsibility
const getUtilitiesSummary = (config: UtilitiesConfig) => {
  const entries = Object.entries(config || {});
  const tenantPays = entries.filter(([_, v]) => v === 'tenant_pays').length;
  const managerPays = entries.filter(([_, v]) => v === 'manager_pays').length;
  return { tenantPays, managerPays };
};

// Format currency amount from cents
const formatCurrency = (cents: number | null, currency: string) => {
  if (cents === null || cents === undefined) return '-';
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount);
};

// Get contract method display label
const getContractMethodLabel = (method: string | null, t: (key: string) => string) => {
  switch (method) {
    case 'docuseal': return t('tenancy.wizard.docuseal') || 'Digital Signature (AES)';
    case 'yousign': return t('tenancy.wizard.yousign') || 'Qualified Signature (QES)';
    case 'manual': return t('tenancy.wizard.manualUpload') || 'Manual Upload';
    case 'none': return t('tenancy.wizard.noContract') || 'No Contract';
    default: return '-';
  }
};

export function PendingTenancySetupCard({ 
  requirement, 
  onSendInvitation, 
  onCancelSetup,
  isDeleting 
}: PendingTenancySetupCardProps) {
  const { t } = useLanguage();
  const isDraft = requirement.status === 'draft';
  const utilitiesSummary = getUtilitiesSummary(requirement.utilities_config);

  return (
    <Card className={`border-2 ${isDraft ? 'border-amber-500/50 bg-amber-500/5' : 'border-blue-500/50 bg-blue-500/5'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Mail className={`h-5 w-5 ${isDraft ? 'text-amber-600' : 'text-blue-600'}`} />
            <span className="font-medium">{requirement.tenant_email}</span>
          </div>
          <Badge 
            variant="outline" 
            className={isDraft 
              ? 'border-amber-500 text-amber-600 bg-amber-500/10' 
              : 'border-blue-500 text-blue-600 bg-blue-500/10'
            }
          >
            {isDraft ? (t('common.draft') || 'Draft') : (t('common.sent') || 'Sent')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {/* Rent Amount */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.rentAmount') || 'Rent'}</span>
            </div>
            <p className="font-medium">
              {formatCurrency(requirement.rent_amount_cents, requirement.currency)}
            </p>
          </div>

          {/* Security Deposit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.securityDeposit') || 'Deposit'}</span>
            </div>
            <p className="font-medium">
              {formatCurrency(requirement.security_deposit_cents, requirement.currency)}
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.startDate') || 'Start Date'}</span>
            </div>
            <p className="font-medium">
              {requirement.start_date 
                ? format(new Date(requirement.start_date), 'MMM d, yyyy')
                : '-'
              }
            </p>
          </div>

          {/* Payment Day */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.paymentDay') || 'Payment Day'}</span>
            </div>
            <p className="font-medium">
              {requirement.payment_day ? `Day ${requirement.payment_day}` : '-'}
            </p>
          </div>
        </div>

        {/* Second Row - Contract, Utilities, Verifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm pt-2 border-t border-border/50">
          {/* Contract Method */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.contractMethod') || 'Contract'}</span>
            </div>
            <p className="font-medium">
              {getContractMethodLabel(requirement.contract_method, t)}
            </p>
          </div>

          {/* Utilities */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.utilities') || 'Utilities'}</span>
            </div>
            <p className="font-medium">
              {utilitiesSummary.tenantPays > 0 || utilitiesSummary.managerPays > 0 
                ? `${utilitiesSummary.tenantPays} tenant / ${utilitiesSummary.managerPays} manager`
                : t('common.notConfigured') || 'Not configured'
              }
            </p>
          </div>

          {/* Verification Requirements */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs">{t('tenancy.wizard.verifications') || 'Verifications'}</span>
            </div>
            <div className="flex items-center gap-2">
              {requirement.require_email_verification && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Badge>
              )}
              {requirement.require_kyc_verification && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Shield className="h-3 w-3 mr-1" />
                  KYC
                </Badge>
              )}
              {requirement.require_phone_verification && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Phone className="h-3 w-3 mr-1" />
                  Phone
                </Badge>
              )}
              {!requirement.require_email_verification && 
               !requirement.require_kyc_verification && 
               !requirement.require_phone_verification && (
                <span className="text-muted-foreground">{t('common.none') || 'None'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Created date and Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {t('common.created') || 'Created'}: {format(new Date(requirement.created_at), 'MMM d, yyyy')}
          </span>
          
          <div className="flex items-center gap-2">
            {isDraft && (
              <Button 
                size="sm"
                onClick={() => onSendInvitation(requirement)}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                {t('tenancy.sendInvitation') || 'Send Invitation'}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onCancelSetup(requirement)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <X className="h-4 w-4" />
              {t('common.cancel') || 'Cancel'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
