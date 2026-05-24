import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const DEFAULT_UTILITY_TYPES = ['electricity', 'water', 'gas', 'internet', 'heating', 'trash'] as const;

export type UtilityType = string;

export function useUtilityTypes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: utilityTypes = [], isLoading } = useQuery({
    queryKey: ['utility_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'utility_types')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const value = data.setting_value as { value: string[] };
        return value.value || [...DEFAULT_UTILITY_TYPES];
      }

      // Return defaults if no setting exists
      return [...DEFAULT_UTILITY_TYPES];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (types: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'utility_types',
          setting_value: { value: types },
          updated_by: user.id,
          description: 'Available utility types for tenancy setup (stored as JSON array of strings)',
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility_types'] });
      toast.success(t('utilityTypes.updatedSuccess'));
    },
    onError: (error: Error) => {
      toast.error(t('utilityTypes.updateFailed') + ': ' + (error.message || t('common.error')));
    },
  });

  return {
    utilityTypes,
    isLoading,
    updateUtilityTypes: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
