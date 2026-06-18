import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, paymentService, authService } from '@/services';
import { STORAGE_BUCKETS } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export interface RentPayment {
  id: string;
  rent_agreement_id: string;
  property_id: string;
  tenant_id: string;
  manager_id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  payment_received_date: string | null;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  proof_of_payment_url?: string;
  tenant_confirmed?: boolean;
  tenant_confirmed_at?: string;
  manager_reviewed?: boolean;
  manager_reviewed_at?: string;
  proof_review_status?: 'pending' | 'approved' | 'rejected';
  proof_review_notes?: string;
}

export const RENT_PAYMENTS_QUERY_KEY = 'rent-payments';

export function useRentPayments(propertyId?: string) {
  return useQuery({
    queryKey: [RENT_PAYMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      return paymentService.getRentPayments(propertyId) as Promise<RentPayment[]>;
    },
    enabled: !!propertyId,
  });
}

export function useRentPaymentMutations() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const createPayment = useMutation({
    mutationFn: async (payment: Parameters<typeof paymentService.createRentPayment>[0]) => paymentService.createRentPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("rentPayments.createSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.createFailed"));
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentPayment> }) => paymentService.updateRentPayment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("rentPayments.updateSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.updateFailed"));
    },
  });

  const uploadProof = useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${paymentId}/${Date.now()}.${fileExt}`;

      await documentService.uploadFile(STORAGE_BUCKETS.RENT_PAYMENT_PROOFS, filePath, file);

      return paymentService.updateRentPayment(paymentId, {
        proof_of_payment_url: filePath,
        proof_review_status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("payments.proofUploaded"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.proofUploadFailed"));
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (paymentId: string) => paymentService.updateRentPayment(paymentId, {
      status: 'paid',
      payment_received_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("payments.toasts.markedPaid"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.markPaidFailed"));
    },
  });

  const reviewProof = useMutation({
    mutationFn: async ({
      paymentId,
      status,
      notes,
    }: {
      paymentId: string;
      status: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const updates: Partial<RentPayment> = {
        proof_review_status: status,
        proof_review_notes: notes,
        manager_reviewed: true,
        manager_reviewed_at: new Date().toISOString(),
      };

      if (status === 'approved') {
        updates.status = 'paid';
        updates.payment_received_date = new Date().toISOString().split('T')[0];
      }

      return paymentService.updateRentPayment(paymentId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("payments.proofReview.approvedSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.proofReviewFailed"));
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => paymentService.deleteRentPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-rent-payments'] });
      toast.success(t("payments.deleteSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("rentPayments.deleteFailed"));
    },
  });

  return {
    createPayment,
    updatePayment,
    uploadProof,
    markAsPaid,
    reviewProof,
    deletePayment,
  };
}