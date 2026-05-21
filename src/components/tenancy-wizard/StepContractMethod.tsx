import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileSignature, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepProps {
  form: UseFormReturn<any>;
  templates: Array<{ id: string; document_title: string }>;
}

export function StepContractMethod({ form, templates }: StepProps) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          {t('tenancy.wizard.contract')}
        </CardTitle>
        <CardDescription>{t('tenancy.wizard.contractDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <FormField control={form.control} name="contract_method" render={({ field }) => (
          <RadioGroup value={field.value || ''} onValueChange={field.onChange} className="space-y-2">
            {['digital', 'manual', 'none'].map((method) => (
              <label key={method} className={cn(
                "flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                field.value === method && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value={method} className="mt-1" />
                <div className="flex-1">
                  <span className="font-medium">{t(`tenancy.wizard.${method}Signature`)}</span>
                  <p className="text-sm text-muted-foreground mt-1">{t(`tenancy.wizard.${method}SignatureDesc`)}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        )} />
        {form.watch('contract_method') && form.watch('contract_method') !== 'none' && templates.length > 0 && (
          <>
            <Separator />
            <FormField control={form.control} name="selected_template_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tenancy.wizard.selectTemplate')}</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder={t('tenancy.wizard.selectTemplatePlaceholder')} /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4" />{template.document_title}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{t('tenancy.wizard.selectTemplateDesc')}</FormDescription>
              </FormItem>
            )} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
