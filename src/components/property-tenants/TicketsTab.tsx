import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Calendar, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTickets } from "@/hooks/useTickets";
import { formatDate } from "@/lib/dateUtils";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  property?: { id: string; title: string } | null;
}

interface TicketsTabProps {
  propertyId: string;
}

export function TicketsTab({ propertyId }: TicketsTabProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Fetch open tickets for this property
  const { data, isLoading } = useTickets({
    propertyId,
    status: 'open',
    pageSize: 5,
  });

  const tickets = (data?.tickets || []).map(ticket => ({
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    created_at: ticket.created_at,
    property: ticket.property || null,
  }));

  const hasOpenTickets = tickets.length > 0;

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t("tickets.openTickets")}</h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t("tickets.openTickets")}</h3>
      </div>
      
      {hasOpenTickets ? (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tickets.ticketNumber")}</TableHead>
                  <TableHead>{t("tickets.title")}</TableHead>
                  <TableHead>{t("tickets.type")}</TableHead>
                  <TableHead>{t("tickets.status")}</TableHead>
                  <TableHead>{t("tickets.priority")}</TableHead>
                  <TableHead>{t("tickets.created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/properties/${propertyId}/tickets/${ticket.id}`)}
                  >
                    <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {ticket.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ticket.status] || ""}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[ticket.priority] || ""}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/properties/${propertyId}/tickets`)}
          >
            <Ticket className="h-4 w-4 mr-2" />
            {t("tenants.viewAllTickets")}
          </Button>
        </>
      ) : (
        <>
          <div className="text-center py-8 border rounded-lg">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">{t("tickets.noOpenTickets")}</p>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/properties/${propertyId}/tickets`)}
          >
            <Ticket className="h-4 w-4 mr-2" />
            {t("tenants.viewAllTickets")}
          </Button>
        </>
      )}
    </div>
  );
}
