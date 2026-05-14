import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tenancyService, authService, identityService } from '@/services';
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
      const user = await authService.getCurrentUser();
      if (!user) {
        console.log('[useRentAgreements] No authenticated user');
        return [];
      }

      console.log('[useRentAgreements] Fetching for user:', user.id, 'property:', propertyId);

      const managerId = await tenancyService.getPropertyManagerId(propertyId);
      const isManager = managerId === user.id;
      const data = await tenancyService.getRentAgreementsForProperty(propertyId);
      return isManager ? data : data.filter(a => a.tenant_id === user.id);
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
      const user = await authService.getCurrentUser();
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

      return tenancyService.createRentAgreement(insertData);
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
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const existingAgreement = await tenancyService.getRentAgreementForEdit(data.agreement_id);
      if (!existingAgreement) throw new Error('Agreement not found');

      const activeSignature = await tenancyService.getActiveSignature(existingAgreement.tenancy_id);
      if (activeSignature) throw new Error('Cannot edit rent agreement while contract signing is in progress');

      const { agreement_id, ...updateData } = data;
      const result = await tenancyService.updateRentAgreement(agreement_id, updateData);
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
      return identityService.createSEPAMandate({
        agreement_id: data.agreement_id,
        tenant_iban: data.tenant_iban,
      });
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
