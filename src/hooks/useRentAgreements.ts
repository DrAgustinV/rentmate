import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RENT_AGREEMENTS_QUERY_KEY = 'rent-agreements';

interface RentAgreement {
  id: string;
  property_id: string;
  tenancy_id: string;
  manager_id: string;
  tenant_id: string;
  rent_amount_cents: number;
  payment_day: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  currency: string;
  tenant_iban: string | null;
  mandate_id: string | null;
  mandate_status: string;
  created_at: string;
  updated_at: string;
}

export function useRentAgreements(propertyId?: string) {
  return useQuery({
    queryKey: [RENT_AGREEMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const { data, error } = await supabase
        .from('rent_agreements')
        .select(`
          *,
          tenant:profiles!rent_agreements_tenant_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (RentAgreement & { tenant: any })[];
    },
    enabled: !!propertyId,
  });
}

export function useRentAgreementMutations() {
  const queryClient = useQueryClient();

  const createAgreement = useMutation({
    mutationFn: async (data: {
      property_id: string;
      tenancy_id: string;
      tenant_id: string;
      rent_amount_cents: number;
      payment_day: number;
      start_date: string;
      end_date?: string;
      currency: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: any = {
        property_id: data.property_id,
        tenancy_id: data.tenancy_id,
        tenant_id: data.tenant_id,
        manager_id: user.id,
        rent_amount_cents: data.rent_amount_cents,
        payment_day: data.payment_day,
        start_date: data.start_date,
        currency: data.currency,
      };

      if (data.end_date) {
        insertData.end_date = data.end_date;
      }

      const { data: result, error } = await supabase
        .from('rent_agreements')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, variables.property_id] });
      toast.success('Rent agreement created successfully');
    },
    onError: (error: any) => {
      console.error('Create rent agreement error:', error);
      toast.error('Failed to create rent agreement');
    },
  });

  const updateIban = useMutation({
    mutationFn: async (data: { agreement_id: string; tenant_iban: string }) => {
      const { error } = await supabase
        .from('rent_agreements')
        .update({ tenant_iban: data.tenant_iban })
        .eq('id', data.agreement_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY] });
      toast.success('IBAN updated successfully');
    },
    onError: (error: any) => {
      console.error('Update IBAN error:', error);
      toast.error('Failed to update IBAN');
    },
  });

  return {
    createAgreement,
    updateIban,
  };
}
