import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, ticketService } from "@/services";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isPast } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { AlertCircle, Clock, Play, CheckCircle } from "lucide-react";
import { CompleteTaskDialog } from "@/components/maintenance/CompleteTaskDialog";
import { showToast } from "@/lib/toastUtils";

interface ScheduledTasksProps {
  propertyId: string;
}

const ScheduledTasks = ({ propertyId }: ScheduledTasksProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingTask, setCompletingTask] = useState<{
    scheduleId: string;
    ticketId: string;
    taskTitle: string;
  } | null>(null);

  // Helper function to calculate date range for current schedule cycle
  const getScheduleCycleDates = (nextRunDate: string, frequency: string) => {
    const next = parseISO(nextRunDate);
    let cycleStart: Date;
    
    switch (frequency) {
      case 'daily':
        cycleStart = new Date(next);
        cycleStart.setDate(cycleStart.getDate() - 1);
        break;
      case 'weekly':
        cycleStart = new Date(next);
        cycleStart.setDate(cycleStart.getDate() - 7);
        break;
      case 'monthly':
        cycleStart = new Date(next);
        cycleStart.setMonth(cycleStart.getMonth() - 1);
        break;
      case 'yearly':
        cycleStart = new Date(next);
        cycleStart.setFullYear(cycleStart.getFullYear() - 1);
        break;
      default:
        cycleStart = new Date(next);
        cycleStart.setDate(cycleStart.getDate() - 1);
    }
    
    return {
      start: format(cycleStart, "yyyy-MM-dd'T'HH:mm:ss"),
      end: format(next, "yyyy-MM-dd") + 'T23:59:59'
    };
  };

  const { data: scheduledTasks, isLoading } = useQuery({
    queryKey: ["scheduled-tasks", propertyId],
    queryFn: async () => {
      const { data: schedules, error } = await supabase
        .from("recurring_schedules")
        .select(
          `
          id,
          next_run_date,
          frequency,
          is_active,
          end_date,
          ticket_templates (
            id,
            title,
            type,
            priority,
            description
          )
        `
        )
        .eq("property_id", propertyId)
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${format(new Date(), "yyyy-MM-dd")}`)
        .order("next_run_date", { ascending: true });

      if (error) throw error;

      // Fetch associated tickets for each schedule
      const schedulesWithTickets = await Promise.all(
        (schedules || []).map(async (schedule) => {
          const template = schedule.ticket_templates as any;
          const cycleDates = getScheduleCycleDates(schedule.next_run_date, schedule.frequency);
          
          const { data: ticket } = await supabase
            .from("tickets")
            .select("id, status, resolved_at")
            .eq("source_template_id", template?.id)
            .eq("property_id", propertyId)
            .gte("created_at", cycleDates.start)
            .lte("created_at", cycleDates.end)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return { ...schedule, ticket };
        })
      );

      return schedulesWithTickets;
    },
    enabled: !!propertyId,
  });

  const startTaskMutation = useMutation({
    mutationFn: async ({ schedule, template }: { schedule: any; template: any }) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const existingTicket = schedule.ticket;

      if (existingTicket) {
        const { error } = await supabase
          .from("tickets")
          .update({ status: "in_progress" })
          .eq("id", existingTicket.id);

        if (error) throw error;

        await ticketService.addTicketActivity({
          ticket_id: existingTicket.id,
          user_id: user.id,
          activity_type: "status_change",
          old_value: { status: existingTicket.status },
          new_value: { status: "in_progress" },
        });

        return existingTicket.id;
      } else {
        const { data: newTicket, error } = await supabase
          .from("tickets")
          .insert({
            property_id: propertyId,
            source_template_id: template.id,
            title: template.title,
            description: template.description,
            type: template.type,
            priority: template.priority,
            status: "in_progress",
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        await ticketService.addTicketActivity({
          ticket_id: newTicket.id,
          user_id: user.id,
          activity_type: "status_change",
          old_value: null,
          new_value: { status: "in_progress" },
        });

        return newTicket.id;
      }
    },
    onSuccess: (ticketId) => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks", propertyId] });
      showToast.success({
        title: "Task started",
        description: "You can now track progress and add updates",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${propertyId}/tickets/${ticketId}`)}>
            View Ticket
          </Button>
        ),
      });
    },
    onError: (error) => {
      showToast.error({
        title: "Failed to start task",
        description: error.message,
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ ticketId, notes }: { ticketId: string; notes: string }) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes,
        })
        .eq("id", ticketId);

      if (error) throw error;

      await ticketService.addTicketActivity({
        ticket_id: ticketId,
        user_id: user.id,
        activity_type: "status_change",
        old_value: { status: "in_progress" },
        new_value: { status: "resolved" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks", propertyId] });
      showToast.success({ title: "Task completed successfully" });
      setCompletingTask(null);
    },
    onError: (error) => {
      showToast.error({
        title: "Failed to complete task",
        description: error.message,
      });
    },
  });

  const handleStartTask = (schedule: any) => {
    const template = schedule.ticket_templates;
    startTaskMutation.mutate({ schedule, template });
  };

  const handleCompleteTask = (schedule: any, ticket: any) => {
    const template = schedule.ticket_templates;
    setCompletingTask({
      scheduleId: schedule.id,
      ticketId: ticket.id,
      taskTitle: template?.title || "Task",
    });
  };

  const getStatusVariant = (status: string | null) => {
    if (!status) return "outline";
    switch (status) {
      case "resolved":
        return "default";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string | null) => {
    if (!status) return "Not Started";
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const typeColors = {
    maintenance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    repair: "bg-red-500/10 text-red-500 border-red-500/20",
    inspection: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    cleaning: "bg-green-500/10 text-green-500 border-green-500/20",
    other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!scheduledTasks || scheduledTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No upcoming scheduled tasks</h3>
          <p className="text-muted-foreground">Create recurring maintenance tasks to see them here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {scheduledTasks.map((schedule) => {
          const template = schedule.ticket_templates as any;
          const ticket = schedule.ticket;
          const nextRunDate = parseISO(schedule.next_run_date);
          const isOverdue = isPast(nextRunDate) && ticket?.status !== "resolved";

          return (
            <Card key={schedule.id} className={isOverdue ? "border-orange-500/50" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isOverdue && (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                      <h3 className="font-semibold">{template?.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={typeColors[template?.type as keyof typeof typeColors]}>
                        {template?.type}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[template?.priority as keyof typeof priorityColors]}>
                        {template?.priority}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {schedule.frequency}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-medium ${isOverdue ? "text-orange-500" : "text-muted-foreground"}`}>
                      {format(nextRunDate, "dd MMMM yyyy")}
                    </p>
                    {isOverdue && (
                      <p className="text-xs text-orange-500">Overdue</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(ticket?.status)}>
                      {formatStatus(ticket?.status)}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="animate-pulse">
                        Overdue
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!ticket && (
                      <Button
                        size="sm"
                        onClick={() => handleStartTask(schedule)}
                        disabled={startTaskMutation.isPending}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Start Task
                      </Button>
                    )}
                    {ticket && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/properties/${propertyId}/tickets/${ticket.id}`)}
                      >
                        View Ticket
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CompleteTaskDialog
        open={!!completingTask}
        onOpenChange={(open) => !open && setCompletingTask(null)}
        taskTitle={completingTask?.taskTitle || ""}
        ticketId={completingTask?.ticketId}
        propertyId={propertyId}
        onComplete={(notes) => {
          if (completingTask) {
            completeTaskMutation.mutate({
              ticketId: completingTask.ticketId,
              notes,
            });
          }
        }}
        isLoading={completeTaskMutation.isPending}
      />
    </>
  );
};

export default ScheduledTasks;
