import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      const { data, error } = await supabase
        .from('utility_payments')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_due_date', { ascending: false });

      if (error) throw error;
      return data as UtilityPayment[];
    },
    enabled: !!propertyId,
  });
}

export function useUtilityPaymentMutations() {
  const queryClient = useQueryClient();

  const createPayment = useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await supabase
        .from('utility_payments')
        .insert([payment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
      toast.success('Utility payment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create utility payment: ${error.message}`);
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UtilityPayment> }) => {
      const { data, error } = await supabase
        .from('utility_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
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

      const { error: uploadError } = await supabase.storage
        .from('utility-payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: updateError } = await supabase
        .from('utility_payments')
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
      const { data: { user } } = await supabase.auth.getUser();
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

      const { data, error } = await supabase
        .from('utility_payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [UTILITY_PAYMENTS_QUERY_KEY] });
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
    reviewProof,
  };
}
