import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn<any>;
  utilityTypes: string[];
}

export function StepUtilities({ form, utilityTypes }: StepProps) {
  const { t } = useLanguage();
  const values = form.watch('utilities_config') || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {t('tenancy.wizard.utilities') || 'Utilities Setup'}
        </CardTitle>
        <CardDescription>
          {t('tenancy.wizard.utilitiesDesc') || 'Define who is responsible for each utility'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {utilityTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('tenancy.wizard.noUtilities') || 'No utilities configured'}
            </p>
          ) : (
            utilityTypes.map((ut) => (
              <div
                key={ut}
                className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Label className="text-sm font-medium capitalize cursor-pointer">
                    {ut.replace(/_/g, ' ')}
                  </Label>
                </div>
                <Select
                  value={values[ut] || 'not_applicable'}
                  onValueChange={(v) => form.setValue(`utilities_config.${ut}`, v as any)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager_pays">
                      {t('utilities.managerPays') || 'Manager Pays'}
                    </SelectItem>
                    <SelectItem value="tenant_pays">
                      {t('utilities.tenantPays') || 'Tenant Pays & Uploads'}
                    </SelectItem>
                    <SelectItem value="not_applicable">
                      {t('utilities.notApplicable') || 'Not Applicable'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StepUtilities;
