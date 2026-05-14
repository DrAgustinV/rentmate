import { useQuery } from '@tanstack/react-query';
import { tenancyService, propertyService } from '@/services';

export const TENANT_PROPERTIES_QUERY_KEY = 'tenant-properties';

interface TenantPropertyFilters {
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

export function useTenantProperties(filters: TenantPropertyFilters = {}) {
  const { tenantId, page = 1, pageSize = 10 } = filters;

  return useQuery({
    queryKey: [TENANT_PROPERTIES_QUERY_KEY, tenantId, page, pageSize],
    queryFn: async () => {
      if (!tenantId) {
        return { properties: [], totalCount: 0, totalPages: 0 };
      }

      const tenantRels = await tenancyService.getTenantPropertyIds(tenantId);

      if (!tenantRels || tenantRels.length === 0) {
        return { properties: [], totalCount: 0, totalPages: 0 };
      }

      const propertyIds = tenantRels.map((rel) => rel.property_id);

      // Then fetch properties with pagination
      const result = await propertyService.getPropertiesByIds(propertyIds, page, pageSize);

      return {
        properties: result.properties,
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / pageSize),
      };
    },
    enabled: !!tenantId,
  });
}
