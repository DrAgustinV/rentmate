import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setupOptimisticUpdate, rollbackOptimisticUpdate } from '@/lib/optimisticHelpers';

export const PROPERTIES_QUERY_KEY = 'properties';

interface PropertyFilters {
  status?: 'active' | 'ending_tenancy' | 'inactive';
  managerId?: string;
  page?: number;
  pageSize?: number;
}

export function useProperties(filters: PropertyFilters = {}) {
  const { managerId, status, page, pageSize } = filters;

  return useQuery({
    queryKey: [PROPERTIES_QUERY_KEY, managerId, status, page, pageSize],
    queryFn: async () => {
      if (!managerId) {
        return { properties: [], totalCount: 0, totalPages: 0 };
      }

      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      query = query.eq('manager_id', managerId);

      if (status) {
        query = query.eq('status', status);
      }

      // Only apply pagination if page and pageSize are provided
      if (page !== undefined && pageSize !== undefined) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        properties: data || [],
        totalCount: count || 0,
        totalPages: pageSize ? Math.ceil((count || 0) / pageSize) : 1,
      };
    },
    enabled: !!managerId,
  });
}

export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: [PROPERTIES_QUERY_KEY, propertyId],
    queryFn: async () => {
      if (!propertyId) return null;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function usePropertyMutations() {
  const queryClient = useQueryClient();

  const createProperty = useMutation({
    mutationFn: async (property: any) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(property)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newProperty) => {
      return await setupOptimisticUpdate(
        queryClient,
        [PROPERTIES_QUERY_KEY],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            properties: [
              { ...newProperty, id: 'temp-' + Date.now(), created_at: new Date().toISOString() },
              ...old.properties
            ],
            totalCount: old.totalCount + 1
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success('Property created successfully');
    },
    onError: (error: any, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, [PROPERTIES_QUERY_KEY], context);
      toast.error(error.message || 'Failed to create property');
    },
  });

  const updateProperty = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      return await setupOptimisticUpdate(
        queryClient,
        [PROPERTIES_QUERY_KEY],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            properties: old.properties.map((p: any) =>
              p.id === id ? { ...p, ...updates } : p
            )
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success('Property updated successfully');
    },
    onError: (error: any, _variables, context) => {
      rollbackOptimisticUpdate(queryClient, [PROPERTIES_QUERY_KEY], context);
      toast.error(error.message || 'Failed to update property');
    },
  });

  const archiveProperty = useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: 'sold' | 'no_longer_managing' | 'merged_with_other_property' | 'other';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('properties')
        .update({
          status: 'inactive',
          deleted_at: new Date().toISOString(),
          delete_reason: reason,
          modification_reason: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTIES_QUERY_KEY] });
      toast.success('Property archived successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive property');
    },
  });

  return {
    createProperty,
    updateProperty,
    archiveProperty,
  };
}
