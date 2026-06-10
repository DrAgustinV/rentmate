import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/lib/toast';
import type { CreateCostInput, UpdateCostInput } from '@/services/costService';

export const PROPERTY_COSTS_QUERY_KEY = 'property-costs';

export function usePropertyCosts(propertyId?: string) {
  return useQuery({
    queryKey: [PROPERTY_COSTS_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return costService.getPropertyCosts(propertyId);
    },
    enabled: !!propertyId,
  });
}

export function usePropertyCostMutations(propertyId: string) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PROPERTY_COSTS_QUERY_KEY, propertyId] });
  };

  const createCost = useMutation({
    mutationFn: (input: CreateCostInput) => costService.createPropertyCost(input),
    onSuccess: () => {
      invalidate();
      showToast.success(t("costs.successCreated"));
    },
    onError: (error: Error) => {
      showToast.error(error.message);
    },
  });

  const updateCost = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCostInput }) =>
      costService.updatePropertyCost(id, updates),
    onSuccess: () => {
      invalidate();
      showToast.success(t("costs.successUpdated"));
    },
    onError: (error: Error) => {
      showToast.error(error.message);
    },
  });

  const deleteCost = useMutation({
    mutationFn: (id: string) => costService.deletePropertyCost(id),
    onSuccess: () => {
      invalidate();
      showToast.success(t("costs.successDeleted"));
    },
    onError: (error: Error) => {
      showToast.error(error.message);
    },
  });

  return { createCost, updateCost, deleteCost };
}
