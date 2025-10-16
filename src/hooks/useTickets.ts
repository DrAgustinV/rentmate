import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const TICKETS_QUERY_KEY = 'tickets';

interface TicketFilters {
  propertyId?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  type?: 'maintenance' | 'repair' | 'inspection' | 'request' | 'issue' | 'incident' | 'cleaning' | 'other';
  page?: number;
  pageSize?: number;
}

export function useTickets(filters: TicketFilters = {}) {
  const { propertyId, status, type, page = 1, pageSize = 10 } = filters;

  return useQuery({
    queryKey: [TICKETS_QUERY_KEY, propertyId, status, type, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          property:properties(title, address),
          created_by_profile:profiles!tickets_created_by_fkey(first_name, last_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('type', type);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        tickets: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

export function useTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: [TICKETS_QUERY_KEY, ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          property:properties(title, address),
          created_by_profile:profiles!tickets_created_by_fkey(first_name, last_name, email),
          assigned_to_profile:profiles!tickets_assigned_to_fkey(first_name, last_name, email)
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useTicketMutations() {
  const queryClient = useQueryClient();

  const createTicket = useMutation({
    mutationFn: async (ticket: any) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY] });
      toast.success('Ticket created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket');
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY] });
      toast.success('Ticket updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update ticket');
    },
  });

  return {
    createTicket,
    updateTicket,
  };
}
