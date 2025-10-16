import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      // First get property IDs where user is a tenant
      const { data: tenantRels, error: tenantError } = await supabase
        .from('property_tenants')
        .select('property_id')
        .eq('tenant_id', tenantId);

      if (tenantError) throw tenantError;

      if (!tenantRels || tenantRels.length === 0) {
        return { properties: [], totalCount: 0, totalPages: 0 };
      }

      const propertyIds = tenantRels.map((rel) => rel.property_id);

      // Then fetch properties with pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .in('id', propertyIds)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        properties: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!tenantId,
  });
}
