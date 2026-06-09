import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateUtils";
import { RotateCw, Calendar, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/EmptyState";
import { ticketStatusColors, ticketPriorityColors } from "@/lib/statusColors";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  scheduled_date?: string | null;
  source_template_id?: string | null;
  properties: { id: string; title: string } | null;
  ticket_templates?: { title: string } | null;
  resolved_by?: string | null;
  resolver?: { first_name: string; last_name: string } | null;
}

interface TicketsListProps {
  tickets: Ticket[];
  isLoading: boolean;
  showRecurringBadge?: boolean;
}

export function TicketsList({ tickets, isLoading, showRecurringBadge = false }: TicketsListProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full shimmer" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('tickets.noTickets')}
        description={t('tickets.noTicketsDesc')}
      />
    );
  }

  return (
    <div className="rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tickets.ticketNumber')}</TableHead>
            <TableHead>{t('tickets.ticketTitle')}</TableHead>
            <TableHead>{t('tickets.type')}</TableHead>
            <TableHead>{t('tickets.status')}</TableHead>
            <TableHead>{t('tickets.priority')}</TableHead>
            <TableHead>{t('tickets.created')}</TableHead>
            <TableHead>{t('tickets.completedBy')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket, index) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                const propertyId = ticket.properties?.id;
                if (propertyId) {
                  navigate(`/properties/${propertyId}/tickets/${ticket.id}`);
                }
              }}
            >
              <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2 flex-wrap">
                  {ticket.title}
                  {showRecurringBadge && ticket.source_template_id && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <RotateCw className="h-3 w-3" />
                      {t('tickets.recurring')}
                    </Badge>
                  )}
                  {ticket.scheduled_date && new Date(ticket.scheduled_date) > new Date() && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {t('tickets.scheduledFor') || 'Scheduled'}: {formatDate(ticket.scheduled_date)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">{ticket.type}</TableCell>
              <TableCell>
                <Badge className={ticketStatusColors[ticket.status as keyof typeof ticketStatusColors] || ""}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={ticketPriorityColors[ticket.priority as keyof typeof ticketPriorityColors] || ""}>
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(ticket.created_at)}</TableCell>
              <TableCell>
                {ticket.status === "resolved" && ticket.resolver
                  ? `${ticket.resolver.first_name} ${ticket.resolver.last_name}`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
