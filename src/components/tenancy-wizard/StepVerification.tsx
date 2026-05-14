import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Shield, Smartphone, Info, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn<any>;
  canUseGovId: boolean;
}

export function StepVerification({ form, canUseGovId }: StepProps) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('tenancy.wizard.verification')}
        </CardTitle>
        <CardDescription>{t('tenancy.wizard.verificationDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField control={form.control} name="require_email_verification" render={({ field }) => (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">{t('tenancy.wizard.emailVerification')}</Label>
                <p className="text-sm text-muted-foreground">{t('tenancy.wizard.emailVerificationDesc')}</p>
              </div>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )} />
        <FormField control={form.control} name="require_kyc_verification" render={({ field }) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">{t('tenancy.wizard.kycVerification')}</Label>
                  <p className="text-sm text-muted-foreground">{t('tenancy.wizard.kycVerificationDesc')}</p>
                </div>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </div>
            {field.value && (
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {canUseGovId ? (
                    <><span className="font-medium">{t('tenancy.wizard.availableMethod')}:</span> {t('tenancy.wizard.governmentIdVerification')}</>
                  ) : (
                    <span className="text-muted-foreground"><Lock className="h-3 w-3 inline mr-1" />{t('tenancy.wizard.upgradeForIdVerification')}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )} />
        <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <Label className="font-medium">{t('tenancy.wizard.phoneVerification')}</Label>
                <Badge variant="secondary" className="text-xs">{t('common.comingSoon')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('tenancy.wizard.phoneVerificationDesc')}</p>
            </div>
          </div>
          <Switch disabled />
        </div>
      </CardContent>
    </Card>
  );
}
