import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplatesManagerContent } from "./TemplatesManagerContent";

interface TemplatesManagerProps {
  propertyId: string;
}

export default function TemplatesManager({ propertyId }: TemplatesManagerProps) {
  const queryClient = useQueryClient();

  const { data: tasksWithSchedules, isLoading } = useQuery({
    queryKey: ["tasks-with-schedules", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_templates")
        .select(
          `
          *,
          recurring_schedules (*)
        `
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
      queryClient.invalidateQueries({ queryKey: ["tasks-with-schedules"] });
      toast.success("Task deleted");
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
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
      queryClient.invalidateQueries({ queryKey: ["tasks-with-schedules"] });
      toast.success("Schedule updated");
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    },
  });

  return (
    <TemplatesManagerContent
      tasksWithSchedules={tasksWithSchedules}
      isLoading={isLoading}
      onToggleSchedule={(scheduleId, isActive) =>
        toggleScheduleMutation.mutate({ scheduleId, isActive })
      }
      onDeleteTask={(templateId) => deleteTemplateMutation.mutate(templateId)}
    />
  );
}
