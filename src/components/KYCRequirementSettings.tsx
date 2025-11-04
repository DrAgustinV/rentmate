import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function KYCRequirementSettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [requireKYC, setRequireKYC] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('require_kyc_for_contracts')
        .eq('id', user.id)
        .single();

      setRequireKYC(profile?.require_kyc_for_contracts ?? false);
    } catch (error) {
      console.error('Error loading KYC settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ require_kyc_for_contracts: checked })
        .eq('id', user.id);

      if (error) throw error;

      setRequireKYC(checked);
      toast({
        title: t('common.success'),
        description: checked 
          ? "KILT KYC is now required for contract signing"
          : "KILT KYC is now optional for contract signing",
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('contractSignature.requireKYCTitle')}
        </CardTitle>
        <CardDescription>
          {t('contractSignature.requireKYCDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="require-kyc">Require KILT KYC for Contract Signing</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, both manager and tenant must complete blockchain identity verification before signing contracts
            </p>
          </div>
          <Switch
            id="require-kyc"
            checked={requireKYC}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-2">
            <p><strong>Optional (Default):</strong> Contracts can be signed with standard e-signatures. KILT KYC provides additional blockchain identity verification but is not required.</p>
            <p><strong>Required:</strong> Both parties must complete KILT KYC verification before initiating contract signatures. Provides maximum security and verifiable digital identities.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
