import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, CheckCircle2, Clock, AlertTriangle, Loader2, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSEPAMandate } from '@/hooks/useSEPAMandate';

interface SEPAMandateSignatureProps {
  agreement: {
    id: string;
    mandate_id: string | null;
    mandate_status: string;
    mandate_pdf_url?: string | null;
    mandate_signed_at?: string | null;
    rent_amount_cents: number;
    currency: string;
    payment_day: number;
    tenant_iban: string | null;
    manager_id: string;
  };
  creditorName: string;
  creditorIban?: string;
  tenantName: string;
}

export function SEPAMandateSignature({ agreement, creditorName, creditorIban = '', tenantName }: SEPAMandateSignatureProps) {
  const { t } = useLanguage();
  const [signing, setSigning] = useState(false);
  const [managerIban, setManagerIban] = useState<string>('');
  const [loadingIban, setLoadingIban] = useState(true);

  const {
    mandate,
    isLoading,
    viafirmaSession,
    isPolling,
    createMandateMutation,
    cancelMandateMutation,
    downloadMandatePdf,
    refetch,
  } = useSEPAMandate(agreement.id);

  // Fetch manager's IBAN from profiles
  useEffect(() => {
    const fetchManagerIban = async () => {
      setLoadingIban(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('manager_iban')
          .eq('id', agreement.manager_id)
          .single();
        
        if (error) throw error;
        
        if (data?.manager_iban) {
          setManagerIban(data.manager_iban);
        }
      } catch (error: any) {
        console.error('Error fetching manager IBAN:', error);
      } finally {
        setLoadingIban(false);
      }
    };
    
    if (agreement.manager_id) {
      fetchManagerIban();
    }
  }, [agreement.manager_id]);

  const handleCreateMandate = async () => {
    setSigning(true);
    try {
      await createMandateMutation.mutateAsync({
        creditorName,
        creditorIban: managerIban || creditorIban,
        debtorName: tenantName,
        debtorIban: agreement.tenant_iban || '',
        amountCents: agreement.rent_amount_cents,
        currency: agreement.currency,
        paymentDay: agreement.payment_day,
      });
    } catch (error: any) {
      toast.error(error.message || t('payments.mandate.creationFailed'));
    } finally {
      setSigning(false);
    }
  };

  const handleCancelMandate = async () => {
    try {
      await cancelMandateMutation.mutateAsync();
    } catch (error: any) {
      toast.error(error.message || t('payments.mandate.cancelFailed'));
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
    const status = mandate?.mandate_status || agreement.mandate_status;
    switch (status) {
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

  if (loadingIban) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = mandate?.mandate_status || agreement.mandate_status;
  const isPending = status === 'pending' || status === 'pending_signature';
  const isActive = status === 'active';
  const isFailed = status === 'failed';

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
        {isFailed && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">⚠️ Mandate Failed</p>
              <p className="text-sm">
                The mandate signing process failed. Please try again or contact support.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Creditor (Landlord)</p>
            <p className="font-medium">{creditorName}</p>
            <p className="text-sm font-mono">{managerIban ? maskIban(managerIban) : 'Not configured'}</p>
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

          {mandate?.mandate_id && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Mandate Reference</p>
              <p className="text-sm font-mono">{mandate.mandate_id}</p>
            </div>
          )}

          {mandate?.mandate_signed_at && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Signed At</p>
              <p className="text-sm">{new Date(mandate.mandate_signed_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {isPending && viafirmaSession && (
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

            <div className="space-y-2">
              <p className="text-sm font-medium">Complete your signature:</p>
              <Button 
                className="w-full" 
                onClick={() => window.open(viafirmaSession.signatureUrl, '_blank')}
                disabled={signing}
              >
                {signing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Sign Mandate
                  </>
                )}
              </Button>
            </div>

            {isPolling && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for signature completion...
              </p>
            )}

            {!agreement.tenant_iban && (
              <p className="text-sm text-center text-muted-foreground">
                Please configure your IBAN before signing the mandate
              </p>
            )}
          </div>
        )}

        {isActive && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm font-medium">Mandate Active</p>
              <p className="text-sm text-muted-foreground">
                Your SEPA Direct Debit mandate is active and rent payments will be collected automatically.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {!isActive && !isPending && !isFailed && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  You need to sign the SEPA Direct Debit mandate to enable automatic rent payments.
                </p>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleCreateMandate} 
              disabled={signing || !agreement.tenant_iban}
              className="w-full"
            >
              {signing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Mandate...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Sign Mandate
                </>
              )}
            </Button>

            {!agreement.tenant_iban && (
              <p className="text-sm text-center text-muted-foreground">
                Please configure your IBAN before signing the mandate
              </p>
            )}
          </div>
        )}

        {isActive && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={downloadMandatePdf}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Mandate PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancelMandate}
              className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Mandate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
