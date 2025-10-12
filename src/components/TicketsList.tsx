import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { RotateCw } from "lucide-react";

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
    return <div className="text-center py-12 text-muted-foreground">No tickets found</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Schedule #</TableHead>
            <TableHead>Template Title</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules?.map((schedule) => (
            <TableRow key={schedule.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-mono text-sm">{schedule.id}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {schedule.ticket_templates?.title}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <RotateCw className="h-3 w-3" />
                    Recurring
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="capitalize">{schedule.frequency}</TableCell>
              <TableCell>
                <Badge className={schedule.is_active ? "bg-green-500" : "bg-gray-500"}>
                  {schedule.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{schedule.next_run_date}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScheduleMutation.mutate({
                      scheduleId: schedule.id,
                      isActive: schedule.is_active,
                    });
                  }}
                >
                  {schedule.is_active ? "Pause" : "Resume"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!schedules?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No schedules yet. Create your first recurring schedule.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
