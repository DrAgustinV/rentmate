import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const sepaSchema = z.object({
  legal_name: z.string().min(2, 'Legal name must be at least 2 characters'),
  manager_iban: z
    .string()
    .min(15, 'IBAN must be at least 15 characters')
    .max(34, 'IBAN must not exceed 34 characters')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Invalid IBAN format (e.g., ES1234567890123456789012)'),
  sepa_creditor_identifier: z
    .string()
    .min(10, 'Creditor ID must be at least 10 characters')
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'Invalid format (e.g., ES12ZZZ12345678)'),
});

type SEPAFormData = z.infer<typeof sepaSchema>;

export function SEPADirectDebitSettings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const form = useForm<SEPAFormData>({
    resolver: zodResolver(sepaSchema),
    defaultValues: {
      legal_name: '',
      manager_iban: '',
      sepa_creditor_identifier: '',
    },
  });

  useEffect(() => {
    fetchSEPASettings();
  }, []);

  const fetchSEPASettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('legal_name, manager_iban, sepa_creditor_identifier')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.manager_iban && data?.sepa_creditor_identifier) {
        setIsConfigured(true);
        form.reset({
          legal_name: data.legal_name || '',
          manager_iban: data.manager_iban,
          sepa_creditor_identifier: data.sepa_creditor_identifier,
        });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SEPAFormData) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          legal_name: data.legal_name,
          manager_iban: data.manager_iban.toUpperCase().replace(/\s/g, ''),
          sepa_creditor_identifier: data.sepa_creditor_identifier.toUpperCase().replace(/\s/g, ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsConfigured(true);
      toast.success('SEPA settings saved successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading SEPA settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              SEPA Direct Debit Setup
            </CardTitle>
            <CardDescription>
              Configure your bank account for rent collection via SEPA Direct Debit
            </CardDescription>
          </div>
          {isConfigured && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal/Company Name *</Label>
              <Input
                id="legal_name"
                placeholder="Your Company S.L."
                {...form.register('legal_name')}
                className={form.formState.errors.legal_name ? 'border-destructive' : ''}
              />
              {form.formState.errors.legal_name && (
                <p className="text-sm text-destructive">{form.formState.errors.legal_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager_iban">Manager IBAN *</Label>
              <Input
                id="manager_iban"
                placeholder="ES1234567890123456789012"
                className={`font-mono ${form.formState.errors.manager_iban ? 'border-destructive' : ''}`}
                {...form.register('manager_iban')}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/\s/g, '');
                  form.setValue('manager_iban', value);
                }}
              />
              <p className="text-xs text-muted-foreground">
                This is the account where rent payments will be deposited
              </p>
              {form.formState.errors.manager_iban && (
                <p className="text-sm text-destructive">{form.formState.errors.manager_iban.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="sepa_creditor_identifier">SEPA Creditor Identifier *</Label>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                id="sepa_creditor_identifier"
                placeholder="ES12ZZZ12345678"
                className={`font-mono ${form.formState.errors.sepa_creditor_identifier ? 'border-destructive' : ''}`}
                {...form.register('sepa_creditor_identifier')}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/\s/g, '');
                  form.setValue('sepa_creditor_identifier', value);
                }}
              />
              {form.formState.errors.sepa_creditor_identifier && (
                <p className="text-sm text-destructive">{form.formState.errors.sepa_creditor_identifier.message}</p>
              )}
            </div>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Don't have a SEPA Creditor Identifier?</p>
              <p className="text-sm">
                Contact your bank to register for SEPA Direct Debit services. This is typically a free service 
                that allows you to collect recurring payments from your tenants. The registration process usually 
                takes 3-5 business days.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
