import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, Phone } from "lucide-react";
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
      </CardHeader>
      <CardContent>
        <FormField control={form.control} name="tenant_email" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('dialogs.inviteTenant.emailLabel')}</FormLabel>
            <FormControl><Input type="email" placeholder={t('placeholders.tenantEmail')} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Manager-entered tenant contact info */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{t('tenants.managerData')}</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="manager_tenant_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('tenants.managerTenantName')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('tenants.managerTenantName')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="manager_tenant_surname" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t('tenants.managerTenantSurname')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('tenants.managerTenantSurname')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="manager_tenant_phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">{t('tenants.managerTenantPhone')}</FormLabel>
              <FormControl>
                <Input placeholder={t('tenants.managerTenantPhone')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

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
