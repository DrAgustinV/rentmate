import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn;
}

export function StepTenantEmail({ form }: StepProps) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('tenancy.wizard.tenantInfo')}
        </CardTitle>
        <CardDescription>{t('tenancy.wizard.tenantInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField control={form.control} name="tenant_email" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('dialogs.inviteTenant.emailLabel')}</FormLabel>
            <FormControl><Input type="email" placeholder={t('placeholders.tenantEmail')} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="self_manage_only" render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>{t('tenancy.wizard.selfManageOnly')}</FormLabel>
              <p className="text-sm text-muted-foreground">{t('tenancy.wizard.selfManageOnlyDesc')}</p>
            </div>
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
}
