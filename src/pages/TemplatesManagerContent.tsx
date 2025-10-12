import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Pause, Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EditMaintenanceTaskDialog } from "@/components/EditMaintenanceTaskDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  recurring_schedules: Array<{
    id: string;
    frequency: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    next_run_date: string;
  }>;
}

interface TemplatesManagerContentProps {
  tasksWithSchedules: Task[] | undefined;
  isLoading: boolean;
  onToggleSchedule: (scheduleId: string, isActive: boolean) => void;
  onDeleteTask: (templateId: string) => void;
}

export const TemplatesManagerContent = ({
  tasksWithSchedules,
  isLoading,
  onToggleSchedule,
  onDeleteTask,
}: TemplatesManagerContentProps) => {
  const [editingTask, setEditingTask] = useState<{
    templateId: string;
    scheduleId: string;
    data: any;
  } | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!tasksWithSchedules || tasksWithSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No maintenance tasks yet. Create your first task above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="space-y-4">
        {tasksWithSchedules.map((task) => {
          const schedules = task.recurring_schedules || [];
          const activeSchedulesCount = schedules.filter((s) => s.is_active).length;

          return (
            <AccordionItem
              key={task.id}
              value={task.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-start justify-between w-full pr-4">
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold mb-2">{task.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={typeColors[task.type as keyof typeof typeColors]}>
                        {task.type}
                      </Badge>
                      <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                        {task.priority}
                      </Badge>
                      {schedules.length > 0 && (
                        <Badge variant="secondary">
                          {activeSchedulesCount} active schedule{activeSchedulesCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                )}
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Schedules:</h4>
                  {schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No schedules configured for this task.</p>
                  ) : (
                    schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {schedule.frequency}
                            </Badge>
                            <Badge variant={schedule.is_active ? "default" : "secondary"}>
                              {schedule.is_active ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(schedule.start_date), "MMM dd, yyyy")}
                            {schedule.end_date && ` - ${format(parseISO(schedule.end_date), "MMM dd, yyyy")}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Next run: {format(parseISO(schedule.next_run_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setEditingTask({
                                templateId: task.id,
                                scheduleId: schedule.id,
                                data: {
                                  title: task.title,
                                  description: task.description,
                                  type: task.type,
                                  priority: task.priority,
                                  startDate: schedule.start_date,
                                  endDate: schedule.end_date,
                                  frequency: schedule.frequency,
                                  isActive: schedule.is_active,
                                },
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onToggleSchedule(schedule.id, schedule.is_active)}
                          >
                            {schedule.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTemplateId(task.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Task
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {editingTask && (
        <EditMaintenanceTaskDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          templateId={editingTask.templateId}
          scheduleId={editingTask.scheduleId}
          initialData={editingTask.data}
        />
      )}

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This will also delete all schedules and generated tickets
              associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTemplateId && onDeleteTask(deleteTemplateId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
