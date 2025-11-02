import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SEPAMandateSignatureProps {
  agreement: {
    id: string;
    mandate_id: string | null;
    mandate_status: string;
    mandate_pdf_url: string | null;
    mandate_signed_at: string | null;
    rent_amount_cents: number;
    currency: string;
    payment_day: number;
    tenant_iban: string | null;
  };
  creditorName: string;
  creditorIban: string;
  tenantName: string;
}

export function SEPAMandateSignature({ agreement, creditorName, creditorIban, tenantName }: SEPAMandateSignatureProps) {
  const [signing, setSigning] = useState(false);

  const handleMockSignature = async () => {
    setSigning(true);
    try {
      // Mock signature - in production, this would call Viafirma API
      const { error } = await supabase
        .from('rent_agreements')
        .update({
          mandate_status: 'active',
          mandate_signed_at: new Date().toISOString(),
        })
        .eq('id', agreement.id);

      if (error) throw error;

      toast.success('MOCK: Mandate signed! (Real signature via Viafirma in Phase 2)');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSigning(false);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const maskIban = (iban: string) => {
    if (!iban) return '';
    const cleaned = iban.replace(/\s/g, '');
    return `${cleaned.slice(0, 4)}${'*'.repeat(cleaned.length - 8)}${cleaned.slice(-4)}`;
  };

  const getStatusBadge = () => {
    switch (agreement.mandate_status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'pending':
      case 'pending_signature':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Signature
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SEPA Direct Debit Mandate
            </CardTitle>
            <CardDescription>
              Authorization for recurring rent payments
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {agreement.mandate_status !== 'active' && (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">⚠️ MOCK MODE</p>
              <p className="text-sm">
                This is a mock signature workflow. In production, this will integrate with Viafirma 
                for legally binding electronic signatures.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Creditor (Landlord)</p>
            <p className="font-medium">{creditorName}</p>
            <p className="text-sm font-mono">{maskIban(creditorIban)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Debtor (Tenant)</p>
            <p className="font-medium">{tenantName}</p>
            <p className="text-sm font-mono">{agreement.tenant_iban ? maskIban(agreement.tenant_iban) : 'Not provided'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Payment Details</p>
            <p className="font-medium">{formatCurrency(agreement.rent_amount_cents, agreement.currency)} / month</p>
            <p className="text-sm text-muted-foreground">
              Payment due on day {agreement.payment_day} of each month
            </p>
          </div>

          {agreement.mandate_id && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Mandate Reference</p>
              <p className="text-sm font-mono">{agreement.mandate_id}</p>
            </div>
          )}

          {agreement.mandate_signed_at && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Signed At</p>
              <p className="text-sm">{new Date(agreement.mandate_signed_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {agreement.mandate_status === 'pending' || agreement.mandate_status === 'pending_signature' ? (
          <div className="space-y-3">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  By signing this mandate, you authorize {creditorName} to collect recurring payments 
                  from your bank account for rent as specified in your tenancy agreement.
                </p>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleMockSignature} 
              disabled={signing || !agreement.tenant_iban}
              className="w-full"
            >
              {signing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Sign Mandate (Mock)
                </>
              )}
            </Button>

            {!agreement.tenant_iban && (
              <p className="text-sm text-center text-muted-foreground">
                Please configure your IBAN before signing the mandate
              </p>
            )}
          </div>
        ) : agreement.mandate_status === 'active' ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm font-medium">Mandate Active</p>
              <p className="text-sm text-muted-foreground">
                Your SEPA Direct Debit mandate is active and rent payments will be collected automatically.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
