import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { TicketStatus } from '@/types/enums';

export const TICKETS_QUERY_KEY = 'tickets';

interface TicketFilters {
  propertyId?: string;
  status?: TicketStatus;
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
  const { t } = useLanguage();

  const createTicket = useMutation({
    mutationFn: async (ticket: Parameters<typeof ticketService.createTicket>[0]) => ticketService.createTicket(ticket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY] });
      toast.success(t("tickets.createdSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("tickets.createFailed"));
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Parameters<typeof ticketService.updateTicket>[1] }) => ticketService.updateTicket(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY] });
      toast.success(t("tickets.updateSuccess"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("tickets.updateFailed"));
    },
  });

  return {
    createTicket,
    updateTicket,
  };
}
