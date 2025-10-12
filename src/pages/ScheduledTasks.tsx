import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isPast } from "date-fns";
import { AlertCircle, Clock } from "lucide-react";

interface ScheduledTasksProps {
  propertyId: string;
}

const ScheduledTasks = ({ propertyId }: ScheduledTasksProps) => {
  const { data: scheduledTasks, isLoading } = useQuery({
    queryKey: ["scheduled-tasks", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
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
            priority
          )
        `
        )
        .eq("property_id", propertyId)
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${format(new Date(), "yyyy-MM-dd")}`)
        .order("next_run_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

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
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No upcoming scheduled tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scheduledTasks.map((schedule) => {
        const template = schedule.ticket_templates as any;
        const nextRunDate = parseISO(schedule.next_run_date);
        const isOverdue = isPast(nextRunDate);

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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ScheduledTasks;
