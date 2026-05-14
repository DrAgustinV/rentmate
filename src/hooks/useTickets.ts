import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services';
import { toast } from 'sonner';

export const TICKETS_QUERY_KEY = 'tickets';

interface TicketFilters {
  propertyId?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  type?: 'maintenance' | 'repair' | 'inspection' | 'request' | 'issue' | 'incident' | 'cleaning' | 'other';
  hasSourceTemplate?: boolean;
  page?: number;
  pageSize?: number;
}

export function useTickets(filters: TicketFilters = {}) {
  const { propertyId, status, type, hasSourceTemplate, page = 1, pageSize = 10 } = filters;

  return useQuery({
    queryKey: [TICKETS_QUERY_KEY, propertyId, status, type, hasSourceTemplate, page, pageSize],
    queryFn: async () => {
      return ticketService.getTickets({ propertyId, status, type, hasSourceTemplate, page, pageSize });
    },
  });
}

export function useTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: [TICKETS_QUERY_KEY, ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      return ticketService.getTicket(ticketId!);
    },
    enabled: !!ticketId,
  });
}

export function useTicketMutations() {
  const queryClient = useQueryClient();

  const createTicket = useMutation({
    mutationFn: async (ticket: any) => ticketService.createTicket(ticket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY] });
      toast.success('Ticket created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create ticket');
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => ticketService.updateTicket(id, updates),
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
