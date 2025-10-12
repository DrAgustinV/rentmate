import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Calendar as CalendarIcon, FileText } from "lucide-react";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";
import { CreateRecurringScheduleDialog } from "@/components/CreateRecurringScheduleDialog";
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

export default function TemplatesManager() {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const queryClient = useQueryClient();
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { data: property } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data, error } = await supabase.from("properties").select("title, address").eq("id", propertyId).single();

      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["ticket-templates", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("ticket_templates")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: schedules } = useQuery({
    queryKey: ["recurring-schedules", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from("recurring_schedules")
        .select(
          `
          *,
          ticket_templates (*)
        `,
        )
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("ticket_templates").delete().eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules"] });
      toast.success("Template deleted");
      setDeleteTemplateId(null);
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("recurring_schedules")
        .update({ is_active: !isActive })
        .eq("id", scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules"] });
      toast.success("Schedule updated");
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    },
  });

  const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Maintenance Tasks
              </CardTitle>
              <Button onClick={() => setCreateTemplateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates?.map((template) => (
                <div key={template.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {template.type}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`capitalize ${
                          priorityColors[template.priority as keyof typeof priorityColors]
                        } text-white`}
                      >
                        {template.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTemplateId(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!templates?.length && (
                <p className="text-center text-muted-foreground py-8">
                  No maintenance tasks yet. Create your first task.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Recurring Schedules
              </CardTitle>
              <Button onClick={() => setCreateScheduleOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedules?.map((schedule) => (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleScheduleMutation.mutate({
                        scheduleId: schedule.id,
                        isActive: schedule.is_active,
                      })
                    }
                  >
                    {schedule.is_active ? "Pause" : "Resume"}
                  </Button>
                </div>
              ))}
              {!schedules?.length && (
                <p className="text-center text-muted-foreground py-8">
                  No schedules yet. Create your first recurring schedule.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTemplateDialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen} propertyId={propertyId!} />

      <CreateRecurringScheduleDialog
        open={createScheduleOpen}
        onOpenChange={setCreateScheduleOpen}
        propertyId={propertyId!}
      />

      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This will also delete any recurring schedules associated
              with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
