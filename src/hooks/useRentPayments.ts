import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, paymentService, authService } from '@/services';
import { STORAGE_BUCKETS } from '@/constants';
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

  const createPayment = useMutation({
    mutationFn: async (payment: any) => paymentService.createRentPayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      toast.success('Rent payment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rent payment: ${error.message}`);
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentPayment> }) => paymentService.updateRentPayment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      toast.success('Rent payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rent payment: ${error.message}`);
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
      toast.success('Proof of payment uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload proof: ${error.message}`);
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
      toast.success('Payment marked as paid');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
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
      toast.success('Proof reviewed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to review proof: ${error.message}`);
    },
  });

  return {
    createPayment,
    updatePayment,
    uploadProof,
    markAsPaid,
    reviewProof,
  };
}