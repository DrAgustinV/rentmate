import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export const TENANCY_REQUIREMENTS_QUERY_KEY = 'tenancy-requirements';

export type UtilityConfig = 'manager_pays' | 'tenant_pays' | 'not_applicable';

export interface UtilitiesConfig {
  electricity?: UtilityConfig;
  water?: UtilityConfig;
  gas?: UtilityConfig;
  internet?: UtilityConfig;
  heating?: UtilityConfig;
  trash?: UtilityConfig;
  other?: UtilityConfig;
}

export interface TenancyRequirement {
  id: string;
  property_id: string;
  invitation_id: string | null;
  tenancy_id: string | null;
  created_by: string;
  tenant_email: string;
  require_email_verification: boolean;
  require_kyc_verification: boolean;
  require_phone_verification: boolean;
  contract_method: 'docuseal' | 'yousign' | 'manual' | 'none' | null;
  selected_template_id: string | null;
  rent_amount_cents: number | null;
  currency: string;
  security_deposit_cents: number | null;
  payment_day: number | null;
  start_date: string | null;
  end_date: string | null;
  utilities_config: UtilitiesConfig;
  questionnaire_enabled: boolean;
  questionnaire_config: any;
  status: 'draft' | 'sent' | 'accepted' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateTenancyRequirementInput {
  property_id: string;
  tenant_email: string;
  require_email_verification?: boolean;
  require_kyc_verification?: boolean;
  require_phone_verification?: boolean;
  contract_method?: 'docuseal' | 'yousign' | 'manual' | 'none' | null;
  selected_template_id?: string | null;
  rent_amount_cents?: number | null;
  currency?: string;
  security_deposit_cents?: number | null;
  payment_day?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  utilities_config?: UtilitiesConfig;
}

export function useTenancyRequirements(propertyId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [TENANCY_REQUIREMENTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenancy_requirements')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenancyRequirement[];
    },
    enabled: !!propertyId,
  });

  const createRequirement = useMutation({
    mutationFn: async (input: CreateTenancyRequirementInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tenancy_requirements')
        .insert({
          property_id: input.property_id,
          tenant_email: input.tenant_email,
          created_by: userData.user.id,
          require_email_verification: input.require_email_verification ?? true,
          require_kyc_verification: input.require_kyc_verification ?? false,
          require_phone_verification: input.require_phone_verification ?? false,
          contract_method: input.contract_method,
          selected_template_id: input.selected_template_id,
          rent_amount_cents: input.rent_amount_cents,
          currency: input.currency ?? 'EUR',
          security_deposit_cents: input.security_deposit_cents,
          payment_day: input.payment_day,
          start_date: input.start_date,
          end_date: input.end_date,
          utilities_config: input.utilities_config ? JSON.parse(JSON.stringify(input.utilities_config)) : {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as TenancyRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANCY_REQUIREMENTS_QUERY_KEY, propertyId] });
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const updateRequirement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenancyRequirement> & { id: string }) => {
      // Convert utilities_config to JSON-compatible format if present
      const dbUpdates: Record<string, any> = { ...updates };
      if (updates.utilities_config) {
        dbUpdates.utilities_config = JSON.parse(JSON.stringify(updates.utilities_config));
      }
      
      const { data, error } = await supabase
        .from('tenancy_requirements')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TenancyRequirement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANCY_REQUIREMENTS_QUERY_KEY, propertyId] });
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tenancy_requirements')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Verify that a row was actually deleted
      if (!data || data.length === 0) {
        throw new Error('Unable to cancel this tenancy setup. It may have already been processed.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANCY_REQUIREMENTS_QUERY_KEY, propertyId] });
      toast.success(t('tenancy.setupCancelled') || 'Tenancy setup cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || t('common.error'));
    },
  });

  return {
    requirements: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  };
}
