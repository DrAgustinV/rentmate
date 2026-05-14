import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentService, tenancyService, identityService } from '@/services';
import { STORAGE_BUCKETS } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export interface SEPAMandate {
  id: string;
  agreement_id: string;
  mandate_id: string | null;
  mandate_status: 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';
  mandate_pdf_url: string | null;
  mandate_signed_at: string | null;
  creditor_name: string;
  creditor_iban: string;
  debtor_name: string;
  debtor_iban: string;
  amount_cents: number;
  currency: string;
  payment_day: number;
  created_at: string;
  updated_at: string;
}

export interface ViafirmaSession {
  sessionId: string;
  signatureUrl: string;
  status: 'pending' | 'completed' | 'failed';
}

export function useSEPAMandate(agreementId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [viafirmaSession, setViafirmaSession] = useState<ViafirmaSession | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch existing mandate
  const { data: mandate, isLoading, refetch } = useQuery({
    queryKey: ['sepa-mandate', agreementId],
    queryFn: async () => {
      return tenancyService.getMandateInfo(agreementId);
    },
    enabled: !!agreementId,
  });

  // Create new mandate session
  const createMandateMutation = useMutation({
    mutationFn: async (data: {
      creditorName: string;
      creditorIban: string;
      debtorName: string;
      debtorIban: string;
      amountCents: number;
      currency: string;
      paymentDay: number;
    }) => {
      return identityService.createSEPAMandateSession(data);
    },
    onSuccess: (session) => {
      setViafirmaSession(session);
      setIsPolling(true);
      toast.success(t('payments.mandate.sessionCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('payments.mandate.sessionFailed'));
    },
  });

  // Poll for mandate status
  useEffect(() => {
    if (!isPolling || !viafirmaSession) return;

    const pollInterval = setInterval(async () => {
      let data;
      try {
        data = await identityService.checkMandateStatus({ sessionId: viafirmaSession.sessionId });
      } catch (error) {
        console.error('Polling error:', error);
        return;
      }

      if (data.status === 'completed') {
        setIsPolling(false);
        setViafirmaSession(prev => prev ? { ...prev, status: 'completed' } : null);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
        toast.success(t('payments.mandate.signedSuccess'));
      } else if (data.status === 'failed') {
        setIsPolling(false);
        setViafirmaSession(prev => prev ? { ...prev, status: 'failed' } : null);
        toast.error(t('payments.mandate.signedFailed'));
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isPolling, viafirmaSession, refetch]);

  // Cancel mandate
  const cancelMandateMutation = useMutation({
    mutationFn: async () => {
      await identityService.cancelSEPAMandate({ agreementId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sepa-mandate', agreementId] });
      toast.success(t('payments.mandate.cancelled'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('payments.mandate.cancelFailed'));
    },
  });

  // Download mandate PDF
  const downloadMandatePdf = useCallback(async () => {
    if (!mandate?.mandate_pdf_url) return;

    const data = await documentService.downloadFile(STORAGE_BUCKETS.SEPA_MANDATES, mandate.mandate_pdf_url);

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sepa-mandate-${agreementId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mandate?.mandate_pdf_url, agreementId]);

  return {
    mandate,
    isLoading,
    viafirmaSession,
    isPolling,
    createMandateMutation,
    cancelMandateMutation,
    downloadMandatePdf,
    refetch,
  };
}
