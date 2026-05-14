// Create this new consolidated hook to replace fragmented queries in TenancyOverviewCard.tsx
import { useQueries } from '@tanstack/react-query';
import { tenancyService, profileService } from '@/services';
import { supabase } from '@/integrations/supabase/client';

export function useTenancyOverview(propertyId: string, tenancyId?: string) {
  return useQueries({
    queries: [
      {
        queryKey: ['property-manager', propertyId],
        queryFn: async () => {
          const managerId = await tenancyService.getPropertyManagerId(propertyId);
          return managerId ? profileService.getProfile(managerId) : null;
        },
        enabled: !!propertyId,
      },
      {
        queryKey: ['rent-agreement', tenancyId],
        queryFn: async () => tenancyService.getActiveRentAgreement(tenancyId!),
        enabled: !!tenancyId,
      },
      {
        queryKey: ['tenancy-requirements', tenancyId],
        queryFn: async () => {
          const { data } = await supabase.from('tenancy_requirements').select('*').eq('tenancy_id', tenancyId!).maybeSingle();
          return data;
        },
        enabled: !!tenancyId,
      },
    ],
  });
}
