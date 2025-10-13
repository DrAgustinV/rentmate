import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateUtils";
import { RotateCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
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

const statusColors = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  resolved: "bg-green-500",
  cancelled: "bg-gray-500",
};

const priorityColors = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function TicketsList({ tickets, isLoading, showRecurringBadge = false }: TicketsListProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t('tickets.noTickets')}</div>;
  }

  return (
    <div className="rounded-md border">
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
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => {
                const propertyId = ticket.properties?.id;
                if (propertyId) {
                  navigate(`/properties/${propertyId}/tickets/${ticket.id}`);
                }
              }}
            >
              <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {ticket.title}
                  {showRecurringBadge && ticket.source_template_id && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <RotateCw className="h-3 w-3" />
                      {t('tickets.recurring')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">{ticket.type}</TableCell>
              <TableCell>
                <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
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
