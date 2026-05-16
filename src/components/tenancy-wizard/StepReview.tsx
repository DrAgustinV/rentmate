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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {t('tenancy.wizard.review') || 'Review & Confirm'}
        </CardTitle>
        <CardDescription>
          {t('tenancy.wizard.reviewDesc') || 'Review the tenancy setup before sending the invitation'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t('tenancy.wizard.tenantInfo') || 'Tenant'}</span>
          </div>
          <p className="text-sm">{form.watch('tenant_email') || '-'}</p>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t('tenancy.wizard.verification') || 'Verification'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.watch('require_email_verification') && (
              <Badge variant="secondary">{t('tenancy.wizard.emailVerification') || 'Email'}</Badge>
            )}
            {form.watch('require_kyc_verification') && (
              <Badge variant="secondary">{t('tenancy.wizard.kycVerification') || 'KYC'}</Badge>
            )}
            {!form.watch('require_email_verification') && !form.watch('require_kyc_verification') && (
              <span className="text-sm text-muted-foreground">{t('tenancy.wizard.noVerification') || 'No verification required'}</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{t('tenancy.wizard.contract') || 'Contract'}</span>
          </div>
          <p className="text-sm capitalize">
            {form.watch('contract_method') === 'digital' && (t('tenancy.wizard.digitalSignature') || 'Digital Signature')}
            {form.watch('contract_method') === 'manual' && (t('tenancy.wizard.manualSignature') || 'Manual / Paper')}
            {form.watch('contract_method') === 'none' && (t('tenancy.wizard.skipContract') || 'Skipped')}
            {!form.watch('contract_method') && '-'}
          </p>
        </div>

        {form.watch('rent_amount') && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('tenancy.wizard.rent') || 'Rent'}</span>
            </div>
            <p className="text-sm">
              {form.watch('rent_amount')} {form.watch('currency')} / {t('common.month') || 'month'}
              {form.watch('security_deposit') && ` • ${t('rentAgreement.securityDeposit') || 'Deposit'}: ${form.watch('security_deposit')} ${form.watch('currency')}`}
            </p>
          </div>
        )}

        {Object.keys(utilitiesConfig).length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('tenancy.wizard.utilities') || 'Utilities'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(utilitiesConfig).map(([utility, config]) => (
                config && (
                  <Badge key={utility} variant="outline" className="capitalize text-xs">
                    {utility.replace(/_/g, ' ')}: {config === 'tenant_pays' ? (t('utilities.tenantPaysShort') || 'Tenant') : config === 'manager_pays' ? (t('utilities.managerPaysShort') || 'Manager') : (t('utilities.notApplicableShort') || 'N/A')}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
