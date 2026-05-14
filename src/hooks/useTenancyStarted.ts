import { useQuery } from "@tanstack/react-query";
import { tenancyService } from "@/services";
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
      
      return tenancyService.getTenancyStartDate(propertyId, tenancyId);
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
