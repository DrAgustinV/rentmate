import { useQuery } from "@tanstack/react-query";
import { ticketService } from "@/services";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";

export function TicketsTable() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      return ticketService.getAdminTickets();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">{t('admin.loadingTickets')}</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.ticketNumber')}</TableHead>
            <TableHead>{t('admin.propertyTitle')}</TableHead>
            <TableHead>{t('admin.type')}</TableHead>
            <TableHead>{t('admin.status')}</TableHead>
            <TableHead>{t('admin.priority')}</TableHead>
            <TableHead>{t('admin.created')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets?.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
              <TableCell className="font-medium">{ticket.title}</TableCell>
              <TableCell>
                <Badge variant="outline">{ticket.type}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    ticket.status === "open" ? "destructive" : ticket.status === "in_progress" ? "default" : "secondary"
                  }
                >
                  {ticket.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    ticket.priority === "high" ? "destructive" : ticket.priority === "medium" ? "default" : "secondary"
                  }
                >
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(ticket.created_at)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/properties/${ticket.property_id}/tickets/${ticket.id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
