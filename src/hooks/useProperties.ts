import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { propertyService } from '@/services';
import { setupOptimisticUpdate, rollbackOptimisticUpdate } from '@/lib/optimisticHelpers';
import type { CreatePropertyInput, UpdatePropertyInput } from '@/services/propertyService';
import type { PropertyStatus } from '@/types/enums';

export const PROPERTIES_QUERY_KEY = 'properties';

interface PropertyFilters {
  status?: PropertyStatus;
  managerId?: string;
  page?: number;
  pageSize?: number;
}

interface PropertiesQueryResult {
  properties: { id: string; created_at: string; [key: string]: unknown }[];
  totalCount: number;
  totalPages: number;
}

export function useProperties(filters: PropertyFilters = {}) {
  const { managerId, status, page, pageSize } = filters;

  return useQuery({
    queryKey: [PROPERTIES_QUERY_KEY, managerId, status, page, pageSize],
    queryFn: async () => {
      if (!managerId) {
        return { properties: [], totalCount: 0, totalPages: 0 };
      }

      const result = await propertyService.getProperties({ managerId, status, page, pageSize });
      return { ...result, totalPages: pageSize ? Math.ceil(result.totalCount / pageSize) : 1 };
    },
    enabled: !!managerId,
  });
}

export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: [PROPERTIES_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return null;

      return propertyService.getProperty(propertyId);
    },
    enabled: !!propertyId,
  });
}

export function usePropertyMutations() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const createProperty = useMutation({
    mutationFn: async (property: CreatePropertyInput) => propertyService.createProperty(property),
    onMutate: async (newProperty) => {
      return await setupOptimisticUpdate(
        queryClient,
        [PROPERTIES_QUERY_KEY],
        (old: PropertiesQueryResult | undefined) => {
          if (!old) return old;
          return {
            ...old,
            properties: [
              { ...newProperty, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as CreatePropertyInput & { id: string; created_at: string },
              ...old.properties
            ],
            totalCount: old.totalCount + 1
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success(t("properties.created"));
    },
    onError: (error: Error, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, [PROPERTIES_QUERY_KEY], context);
      toast.error(error.message || t("properties.createFailed"));
    },
  });

  const updateProperty = useMutation({
    mutationFn: async (params: { id: string; updates: UpdatePropertyInput }) => propertyService.updateProperty(params),
    onMutate: async ({ id, updates }) => {
      return await setupOptimisticUpdate(
        queryClient,
        [PROPERTIES_QUERY_KEY],
        (old: PropertiesQueryResult | undefined) => {
          if (!old) return old;
          return {
            ...old,
            properties: old.properties.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            )
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success(t("properties.updated"));
    },
    onError: (error: Error, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, [PROPERTIES_QUERY_KEY], context);
      toast.error(error.message || t("properties.updateFailed"));
    },
  });

  const archiveProperty = useMutation({
    mutationFn: async (params: { id: string; reason: string; notes?: string }) => propertyService.archiveProperty(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success(t("properties.archived"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("properties.archiveFailed"));
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => propertyService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success(t("properties.deleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("properties.deleteFailed"));
    },
  });

  return {
    createProperty,
    updateProperty,
    archiveProperty,
    deleteProperty,
  };
}
