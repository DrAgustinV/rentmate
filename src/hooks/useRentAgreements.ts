import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { tenancyService, authService, identityService } from '@/services';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { RentAgreementInput, RentAgreementUpdates } from '@/services/tenancyService';

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

interface RealtimePayload {
  old: Record<string, unknown> | null;
  new: Record<string, unknown> | null;
}

export function useRentAgreements(propertyId?: string) {
  const { t } = useLanguage();
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
        (payload: RealtimePayload) => {
          const oldStatus = payload.old?.mandate_status as string | undefined;
          const newStatus = payload.new?.mandate_status as string | undefined;

          if (oldStatus !== newStatus) {
            queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, propertyId] });

            if (newStatus === 'active') {
              toast.success(t("rentAgreements.mandateActivated"));
            } else if (newStatus === 'failed') {
              toast.error(t("rentAgreements.mandateVerificationFailed"));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, queryClient, t]);

  return useQuery({
    queryKey: [RENT_AGREEMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) {
        console.log('[useRentAgreements] No propertyId provided');
        return [];
      }

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
  const { t } = useLanguage();
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

      const insertData: RentAgreementInput = {
        property_id: data.property_id,
        tenancy_id: data.tenancy_id,
        tenant_id: data.tenant_id,
        manager_id: user.id,
        rent_amount_cents: data.rent_amount_cents,
        payment_day: data.payment_day,
        start_date: data.start_date,
        currency: data.currency,
        is_active: true,
      };

      if (data.end_date) {
        insertData.end_date = data.end_date;
      }

      return tenancyService.createRentAgreement(insertData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, variables.property_id] });
      toast.success(t("rentAgreements.createSuccess"));
    },
    onError: (error: Error) => {
      console.error('Create rent agreement error:', error);
      toast.error(t("rentAgreements.createFailed"));
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

      const { agreement_id, ...updates } = data;
      const updateData: RentAgreementUpdates = { ...updates };
      const result = await tenancyService.updateRentAgreement(agreement_id, updateData);
      return { result, property_id: existingAgreement.property_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [RENT_AGREEMENTS_QUERY_KEY, data.property_id] });
      toast.success(t("rentAgreements.updateSuccess"));
    },
    onError: (error: Error) => {
      console.error('Update rent agreement error:', error);
      if (error.message?.includes('contract signing is in progress')) {
        toast.error(t("rentAgreements.editBlockedBySignature"));
      } else {
        toast.error(t("rentAgreements.updateFailed"));
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
      toast.success(t("rentAgreements.ibanSaved"));
    },
    onError: (error: Error) => {
      console.error('Update IBAN error:', error);
      toast.error(t("rentAgreements.mandateCreationFailed"));
    },
  });

  return {
    createAgreement,
    updateAgreement,
    updateIban,
  };
}
