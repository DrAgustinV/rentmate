import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Pause, Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
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
import { Separator } from "@/components/ui/separator";
import { StandardTasksSection } from "@/components/StandardTasksSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { priorityColors, typeColors } from "@/lib/maintenanceColors";

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
  propertyId: string;
}

export const TemplatesManagerContent = ({
  tasksWithSchedules,
  isLoading,
  onToggleSchedule,
  onDeleteTask,
  propertyId,
}: TemplatesManagerContentProps) => {
  const { t } = useLanguage();
  const [editingTask, setEditingTask] = useState<{
    templateId: string;
    scheduleId: string;
    data: Record<string, unknown>;
  } | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Maintenance Tasks Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
            ✏️ {t("maintenance.sections.myTasks") || "My Maintenance Tasks"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("maintenance.sections.myTasksDescription") || "Tasks you've created for this property"}
          </p>
        </div>

        {!tasksWithSchedules || tasksWithSchedules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>{t("maintenance.sections.noCustomTasks") || "No custom tasks yet. Browse standard tasks below or create a new one."}</p>
            </CardContent>
          </Card>
        ) : (
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
                              {schedule.is_active ? t("common.active") : t("common.paused")}
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
                            size="sm"
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
                            <Edit className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onToggleSchedule(schedule.id, schedule.is_active)}
                            title={schedule.is_active ? t("common.pause") : t("common.play")}
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
                    {t("common.delete")}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
          </Accordion>
        )}
      </div>

      <Separator className="my-8" />

      {/* Standard Maintenance Tasks Section */}
      <StandardTasksSection propertyId={propertyId} />

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
    </div>
  );
};
