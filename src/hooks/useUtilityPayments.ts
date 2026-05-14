import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, paymentService, authService } from '@/services';
import { STORAGE_BUCKETS } from '@/constants';
import { toast } from 'sonner';

export interface UtilityPayment {
  id: string;
  property_id: string;
  tenant_id: string;
  manager_id: string;
  utility_type: 'electricity' | 'gas' | 'water' | 'internet' | 'heating' | 'trash' | 'other';
  custom_utility_name?: string;
  amount_cents: number;
  currency: string;
  billing_period_start: string;
  billing_period_end: string;
  payment_due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  proof_of_payment_url?: string;
  proof_review_status: 'pending' | 'approved' | 'rejected';
  proof_review_notes?: string;
  manager_reviewed_by?: string;
  manager_reviewed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const UTILITY_PAYMENTS_QUERY_KEY = 'utility-payments';

export function useUtilityPayments(propertyId?: string) {
  return useQuery({
    queryKey: [UTILITY_PAYMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      return paymentService.getUtilityPayments(propertyId) as Promise<UtilityPayment[]>;
    },
    enabled: !!propertyId,
  });
}

export function useUtilityPaymentMutations() {
  const queryClient = useQueryClient();

  const createPayment = useMutation({
    mutationFn: async (payment: Parameters<typeof paymentService.createUtilityPayment>[0]) => paymentService.createUtilityPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Utility payment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create utility payment: ${error.message}`);
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UtilityPayment> }) => paymentService.updateUtilityPayment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Utility payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update utility payment: ${error.message}`);
    },
  });

  const uploadProof = useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${paymentId}/${Date.now()}.${fileExt}`;

      await documentService.uploadFile(STORAGE_BUCKETS.UTILITY_PAYMENT_PROOFS, filePath, file);

      return paymentService.updateUtilityPayment(paymentId, {
        proof_of_payment_url: filePath,
        proof_review_status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Proof of payment uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload proof: ${error.message}`);
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

      const updates: Partial<UtilityPayment> = {
        proof_review_status: status,
        proof_review_notes: notes,
        manager_reviewed_by: user.id,
        manager_reviewed_at: new Date().toISOString(),
      };

      if (status === 'approved') {
        updates.status = 'paid';
        updates.payment_date = new Date().toISOString().split('T')[0];
      }

      return paymentService.updateUtilityPayment(paymentId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Proof reviewed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to review proof: ${error.message}`);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (paymentId: string) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      return paymentService.updateUtilityPayment(paymentId, {
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        manager_reviewed_by: user.id,
        manager_reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Utility payment marked as paid');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  return {
    createPayment,
    updatePayment,
    uploadProof,
    reviewProof,
    markAsPaid,
  };
}
