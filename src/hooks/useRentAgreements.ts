import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!propertyId) return;

    const channel = supabase
      .channel('mandate-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rent_agreements',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload: any) => {
          const oldStatus = payload.old?.mandate_status;
          const newStatus = payload.new?.mandate_status;

          if (oldStatus !== newStatus) {
            queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, propertyId] });
            
            if (newStatus === 'active') {
              toast.success('SEPA mandate verified and activated!');
            } else if (newStatus === 'failed') {
              toast.error('Mandate verification failed. Please check your IBAN and try again.');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, queryClient]);

  return useQuery({
    queryKey: [RENT_AGREEMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) {
        console.log('[useRentAgreements] No propertyId provided');
        return [];
      }

      // Get current user to determine if they're a tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useRentAgreements] No authenticated user');
        return [];
      }

      console.log('[useRentAgreements] Fetching for user:', user.id, 'property:', propertyId);

      // Build query with filters
      let query = supabase
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
        .eq('property_id', propertyId);

      // If user is a tenant (not the property manager), filter to only their agreements
      // This helps with RLS policy joins
      const { data: propertyData } = await supabase
        .from('properties')
        .select('manager_id')
        .eq('id', propertyId)
        .single();

      const isManager = propertyData && propertyData.manager_id === user.id;
      console.log('[useRentAgreements] User is manager:', isManager);

      if (!isManager) {
        // User is a tenant, not the manager
        console.log('[useRentAgreements] Filtering by tenant_id:', user.id);
        query = query.eq('tenant_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[useRentAgreements] Query error:', error);
        throw error;
      }

      console.log('[useRentAgreements] Query result:', data?.length, 'agreements found');
      console.log('[useRentAgreements] Data:', JSON.stringify(data, null, 2));
      
      return data;
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

  const updateAgreement = useMutation({
    mutationFn: async (data: {
      agreement_id: string;
      rent_amount_cents: number;
      payment_day: number;
      start_date: string;
      end_date?: string | null;
      currency: string;
      security_deposit_cents?: number | null;
      deposit_return_days?: number | null;
      utilities_tenant_responsible?: string | null;
      utilities_manager_responsible?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if contract signing is in progress
      const { data: existingAgreement } = await supabase
        .from('rent_agreements')
        .select('tenancy_id, property_id')
        .eq('id', data.agreement_id)
        .single();

      if (!existingAgreement) {
        throw new Error('Agreement not found');
      }

      const { data: activeSignature } = await supabase
        .from('contract_signatures')
        .select('workflow_status')
        .eq('tenancy_id', existingAgreement.tenancy_id)
        .in('workflow_status', ['pending', 'in_progress'])
        .maybeSingle();

      if (activeSignature) {
        throw new Error('Cannot edit rent agreement while contract signing is in progress');
      }

      const { agreement_id, ...updateData } = data;

      const { data: result, error } = await supabase
        .from('rent_agreements')
        .update(updateData)
        .eq('id', agreement_id)
        .select()
        .single();

      if (error) throw error;
      return { result, property_id: existingAgreement.property_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, data.property_id] });
      toast.success('Rent agreement updated successfully');
    },
    onError: (error: any) => {
      console.error('Update rent agreement error:', error);
      if (error.message.includes('contract signing is in progress')) {
        toast.error('Cannot edit while contract signing is in progress');
      } else {
        toast.error('Failed to update rent agreement');
      }
    },
  });

  const updateIban = useMutation({
    mutationFn: async (data: { agreement_id: string; tenant_iban: string }) => {
      // Call edge function to create SEPA mandate
      const { data: result, error } = await supabase.functions.invoke('create-sepa-mandate', {
        body: {
          agreement_id: data.agreement_id,
          tenant_iban: data.tenant_iban,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY] });
      toast.success('IBAN saved and mandate creation initiated');
    },
    onError: (error: any) => {
      console.error('Update IBAN error:', error);
      toast.error('Failed to create SEPA mandate. Please try again.');
    },
  });

  return {
    createAgreement,
    updateAgreement,
    updateIban,
  };
}
