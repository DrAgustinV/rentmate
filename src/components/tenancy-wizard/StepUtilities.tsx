import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Zap, Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn<any>;
  utilityTypes: string[];
}

export function StepUtilities({ form, utilityTypes }: StepProps) {
  const { t } = useLanguage();
  const [newUtilityType, setNewUtilityType] = useState("");
  const [newUtilityResponsibility, setNewUtilityResponsibility] = useState("not_applicable");

  const currentConfig = form.watch('utilities_config') || {};

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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-1 block">{t('tenancy.wizard.addUtility') || 'Add Utility'}</Label>
            <Select value={newUtilityType} onValueChange={setNewUtilityType}>
              <SelectTrigger>
                <SelectValue placeholder={t('tenancy.wizard.selectUtility') || 'Select utility'} />
              </SelectTrigger>
              <SelectContent>
                {utilityTypes
                  .filter((ut) => !currentConfig[ut] || currentConfig[ut] === '')
                  .map((ut) => (
                    <SelectItem key={ut} value={ut}>
                      {ut.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <Label className="text-sm mb-1 block">{t('tenancy.wizard.responsibility') || 'Responsibility'}</Label>
            <Select value={newUtilityResponsibility} onValueChange={setNewUtilityResponsibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager_pays">{t('tenancy.wizard.managerPays') || 'Manager Pays'}</SelectItem>
                <SelectItem value="tenant_pays">{t('tenancy.wizard.tenantPays') || 'Tenant Pays & Uploads'}</SelectItem>
                <SelectItem value="not_applicable">{t('common.na') || 'Not Applicable'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (newUtilityType && newUtilityResponsibility) {
                form.setValue(`utilities_config.${newUtilityType}`, newUtilityResponsibility as any);
                setNewUtilityType("");
                setNewUtilityResponsibility("not_applicable");
              }
            }}
            disabled={!newUtilityType || !newUtilityResponsibility}
            className="mb-0.5"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('common.add') || 'Add'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{t('tenancy.wizard.configuredUtilities') || 'Configured Utilities'}</Label>
          {Object.keys(currentConfig).filter((k) => currentConfig[k] && currentConfig[k] !== '').length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('tenancy.wizard.noUtilities') || 'No utilities configured yet'}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentConfig)
                .filter(([, value]) => value && value !== '')
                .map(([utility, responsibility]) => (
                  <div key={utility} className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg">
                    <span className="text-sm font-medium capitalize">{utility.replace(/_/g, ' ')}</span>
                    <Badge
                      variant={responsibility === 'manager_pays' ? 'default' : responsibility === 'tenant_pays' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {responsibility === 'manager_pays'
                        ? (t('tenancy.wizard.managerPays') || 'Manager')
                        : responsibility === 'tenant_pays'
                        ? (t('tenancy.wizard.tenantPays') || 'Tenant')
                        : (t('common.na') || 'N/A')}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => {
                        const current = form.getValues('utilities_config') || {};
                        const updated = { ...current };
                        delete updated[utility];
                        form.setValue('utilities_config', updated);
                      }}
                      className="text-muted-foreground hover:text-destructive ml-1"
                      aria-label={`Remove ${utility}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StepUtilities;
