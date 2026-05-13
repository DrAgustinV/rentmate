import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_due_date', { ascending: false });

      if (error) throw error;
      return data as RentPayment[];
    },
    enabled: !!propertyId,
  });
}

export function useRentPaymentMutations() {
  const queryClient = useQueryClient();

  const createPayment = useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .insert([payment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY] });
      toast.success('Rent payment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rent payment: ${error.message}`);
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentPayment> }) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
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

      const { error: uploadError } = await supabase.storage
        .from('rent-payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: updateError } = await supabase
        .from('rent_payments')
        .update({
          proof_of_payment_url: filePath,
          proof_review_status: 'pending',
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
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
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .update({
          status: 'paid',
          payment_received_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
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
      const { data: { user } } = await supabase.auth.getUser();
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

      const { data, error } = await supabase
        .from('rent_payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
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