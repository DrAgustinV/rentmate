import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { showToast } from "@/lib/toast";
import { ticketService } from "@/services";
import { TemplatesManagerContent } from "./TemplatesManagerContent";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplatesManagerProps {
  propertyId: string;
}

export default function TemplatesManager({ propertyId }: TemplatesManagerProps) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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
      await ticketService.deleteTicketTemplate(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-with-schedules"] });
      showToast.success({ title: t("maintenance.taskDeleted") });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      showToast.error({ title: "Failed to delete task" });
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
      showToast.success({ title: t("maintenance.scheduleUpdated") });
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
      showToast.error({ title: "Failed to update schedule" });
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
      propertyId={propertyId}
    />
  );
}
