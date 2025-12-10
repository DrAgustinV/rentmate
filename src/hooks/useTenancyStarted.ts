import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, startOfDay } from "date-fns";

interface UseTenancyStartedResult {
  isStarted: boolean;
  startDate: Date | null;
  formattedStartDate: string | null;
  isLoading: boolean;
}

export function useTenancyStarted(propertyId: string, tenancyId?: string): UseTenancyStartedResult {
  const { data, isLoading } = useQuery({
    queryKey: ['tenancy-start-date', propertyId, tenancyId],
    queryFn: async () => {
      if (!tenancyId) return null;
      
      const { data, error } = await supabase
        .from('rent_agreements')
        .select('start_date')
        .eq('property_id', propertyId)
        .eq('tenancy_id', tenancyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data?.start_date || null;
    },
    enabled: !!propertyId && !!tenancyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const startDate = data ? new Date(data) : null;
  const today = startOfDay(new Date());
  const isStarted = startDate ? !isBefore(today, startOfDay(startDate)) : false;
  const formattedStartDate = startDate ? format(startDate, 'MMM d, yyyy') : null;

  return {
    isStarted,
    startDate,
    formattedStartDate,
    isLoading,
  };
}
