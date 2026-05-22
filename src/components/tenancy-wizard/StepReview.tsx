import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Mail, Shield, FileSignature, FileText, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn<any>;
}

export function StepReview({ form }: StepProps) {
  const { t } = useLanguage();
  const utilitiesConfig = form.watch('utilities_config') || {};

  const contractMethod = form.watch('contract_method');
  const contractLabel =
    contractMethod === 'digital' ? (t('tenancy.wizard.digitalSignature') || 'Digital Signature') :
    contractMethod === 'manual'  ? (t('tenancy.wizard.manualSignature')  || 'Manual / Paper') :
    contractMethod === 'none'    ? (t('tenancy.wizard.skipContract')      || 'Skipped') :
    '-';

  const hasEmailVerif = form.watch('require_email_verification');
  const hasKycVerif   = form.watch('require_kyc_verification');
  const rentAmount    = form.watch('rent_amount');
  const currency      = form.watch('currency');
  const deposit       = form.watch('security_deposit');
  const hasUtilities  = Object.keys(utilitiesConfig).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {t('tenancy.wizard.review') || 'Review & Confirm'}
        </CardTitle>
        {/* <CardDescription>
          {t('tenancy.wizard.reviewDesc') || 'Review the tenancy setup before sending the invitation'}
        </CardDescription> */}
      </CardHeader>
      <CardContent className="divide-y">

        {/* Tenant */}
        <div className="flex items-start gap-3 py-3 first:pt-0">
          <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              {t('tenancy.wizard.tenantInfo') || 'Tenant'}
            </p>
            <p className="text-sm">{form.watch('tenant_email') || '-'}</p>
          </div>
        </div>

        {/* Verification */}
        <div className="flex items-start gap-3 py-3">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {t('tenancy.wizard.verification') || 'Verification'}
            </p>
            {hasEmailVerif || hasKycVerif ? (
              <div className="flex flex-wrap gap-1.5">
                {hasEmailVerif && (
                  <Badge variant="secondary">{t('tenancy.wizard.emailVerification') || 'Email'}</Badge>
                )}
                {hasKycVerif && (
                  <Badge variant="secondary">{t('tenancy.wizard.kycVerification') || 'KYC'}</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('tenancy.wizard.noVerification') || 'No verification required'}
              </p>
            )}
          </div>
        </div>

        {/* Contract */}
        <div className="flex items-start gap-3 py-3">
          <FileSignature className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              {t('tenancy.wizard.contract') || 'Contract'}
            </p>
            <p className="text-sm capitalize">{contractLabel}</p>
          </div>
        </div>

        {/* Rent (conditional) */}
        {rentAmount && (
          <div className="flex items-start gap-3 py-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                {t('tenancy.wizard.rent') || 'Rent'}
              </p>
              <p className="text-sm">
                {rentAmount} {currency} / {t('common.month') || 'month'}
                {deposit && (
                  <span className="text-muted-foreground">
                    {' '}·{' '}{t('rentAgreement.securityDeposit') || 'Deposit'}: {deposit} {currency}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Utilities (conditional) */}
        {hasUtilities && (
          <div className="flex items-start gap-3 py-3 last:pb-0">
            <Zap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {t('tenancy.wizard.utilities') || 'Utilities'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(utilitiesConfig).map(([utility, config]) =>
                  config ? (
                    <Badge key={utility} variant="outline" className="capitalize text-xs">
                      {utility.replace(/_/g, ' ')}:{' '}
                      {config === 'tenant_pays'  ? (t('tenancy.wizard.tenantPays')      || 'Tenant')  :
                       config === 'manager_pays' ? (t('tenancy.wizard.managerPays')     || 'Manager') :
                                                   (t('common.na')   || 'N/A')}
                    </Badge>
                  ) : null
                )}
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}