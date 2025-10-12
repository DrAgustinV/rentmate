import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RotateCw } from "lucide-react";

interface Schedule {
  id: string;
  frequency: string;
  is_active: boolean;
  next_run_date: string;
  ticket_templates?: { title: string } | null;
}

interface TicketsListProps {
  schedules?: Schedule[];
  isLoading: boolean;
  showRecurringBadge?: boolean;
  onToggleSchedule?: (scheduleId: string, isActive: boolean) => void;
}

export function TicketsList({ schedules, isLoading, showRecurringBadge = false, onToggleSchedule }: TicketsListProps) {
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

  if (!schedules || schedules.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No schedules yet. Create your first recurring schedule.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <div key={schedule.id} className="flex items-start justify-between p-3 rounded-lg border">
          <div className="flex-1 space-y-1">
            <h4 className="font-medium">{schedule.ticket_templates?.title}</h4>
            <p className="text-sm text-muted-foreground">Next run: {schedule.next_run_date}</p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {schedule.frequency}
              </Badge>
              {schedule.is_active ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onToggleSchedule?.(schedule.id, schedule.is_active)}>
            {schedule.is_active ? "Pause" : "Resume"}
          </Button>
        </div>
      ))}
    </div>
  );
}
