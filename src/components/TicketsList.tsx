import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  properties: { id: string; title: string } | null;
}

interface TicketsListProps {
  tickets: Ticket[];
  isLoading: boolean;
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

export function TicketsList({ tickets, isLoading }: TicketsListProps) {
  const navigate = useNavigate();

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
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tickets found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
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
              <TableCell className="font-mono text-sm">
                {ticket.ticket_number}
              </TableCell>
              <TableCell className="font-medium">{ticket.title}</TableCell>
              <TableCell>{ticket.properties?.title || "N/A"}</TableCell>
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
              <TableCell>{format(new Date(ticket.created_at), "PPP")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}