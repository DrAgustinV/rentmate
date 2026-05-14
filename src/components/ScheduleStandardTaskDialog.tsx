import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Wrench } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toast";

interface StandardTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  suggested_frequency: string;
  category: string;
}

interface ScheduleStandardTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standardTemplate: StandardTemplate | null;
  propertyId: string;
}

export function ScheduleStandardTaskDialog({
  open,
  onOpenChange,
  standardTemplate,
  propertyId,
}: ScheduleStandardTaskDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [frequency, setFrequency] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isActive, setIsActive] = useState(true);

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

  // Helper to calculate next run date after creating immediate ticket
  const calculateNextRunDate = (currentDate: Date, freq: string): Date => {
    const nextDate = new Date(currentDate);
    switch (freq) {
      case "daily": nextDate.setDate(nextDate.getDate() + 1); break;
      case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
      case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
      case "quarterly": nextDate.setMonth(nextDate.getMonth() + 3); break;
      case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      default: nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
  };

  const scheduleTaskMutation = useMutation({
    mutationFn: async () => {
      if (!standardTemplate || !startDate || !frequency) {
        throw new Error("Missing required fields");
      }

      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Create ticket template from standard template
      const { data: template, error: templateError } = await supabase
        .from("ticket_templates")
        .insert([{
          property_id: propertyId,
          created_by: user.id,
          title: standardTemplate.title,
          description: standardTemplate.description,
          type: standardTemplate.type as any,
          priority: standardTemplate.priority as any,
          source_standard_template_id: standardTemplate.id,
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Always create the first ticket immediately with scheduled_date
      const { error: ticketError } = await supabase
        .from("tickets")
        .insert({
          property_id: propertyId,
          title: standardTemplate.title,
          description: standardTemplate.description,
          type: standardTemplate.type as any,
          priority: standardTemplate.priority as any,
          status: "open",
          created_by: user.id,
          source_template_id: template.id,
          scheduled_date: format(startDate, "yyyy-MM-dd"),
        });

      if (ticketError) {
        console.error("Error creating initial ticket:", ticketError);
        // Don't throw - schedule is still valid
      }

      // Set next_run_date to the NEXT occurrence after start date
      const nextRunDate = calculateNextRunDate(startDate, frequency);

      // Create recurring schedule
      const { error: scheduleError } = await supabase
        .from("recurring_schedules")
        .insert({
          property_id: propertyId,
          template_id: template.id,
          created_by: user.id,
          frequency,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          next_run_date: format(nextRunDate, "yyyy-MM-dd"),
          is_active: isActive,
        });

      if (scheduleError) throw scheduleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["property-tickets"] });
      showToast.success({
        title: t("maintenance.scheduleStandard.success") || "Task scheduled",
        description: t("maintenance.scheduleStandard.successDescription") || "The maintenance task has been scheduled successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error scheduling task:", error);
      showToast.error({
        title: t("common.error") || "Error",
        description: t("maintenance.scheduleStandard.error") || "Failed to schedule task. Please try again.",
      });
    },
  });

  const resetForm = () => {
    setFrequency("");
    setStartDate(undefined);
    setEndDate(undefined);
    setIsActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!standardTemplate || !startDate || !frequency) {
      showToast.error({
        title: t("common.error") || "Error",
        description: t("maintenance.scheduleStandard.missingFields") || "Please fill in all required fields.",
      });
      return;
    }

    scheduleTaskMutation.mutate();
  };

  // Set suggested frequency when template changes
  useState(() => {
    if (standardTemplate && open) {
      setFrequency(standardTemplate.suggested_frequency);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t("maintenance.scheduleStandard.title") || "Schedule Maintenance Task"}
          </DialogTitle>
          <DialogDescription>
            {t("maintenance.scheduleStandard.description") || "Configure the schedule for this maintenance task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Details Section */}
          {standardTemplate && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-medium mb-3">{t("maintenance.scheduleStandard.taskDetails") || "Task Details"}</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-lg">{standardTemplate.title}</h4>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className={typeColors[standardTemplate.type as keyof typeof typeColors]}>
                      {standardTemplate.type}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[standardTemplate.priority as keyof typeof priorityColors]}>
                      {standardTemplate.priority}
                    </Badge>
                    <Badge variant="secondary">{standardTemplate.category}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{standardTemplate.description}</p>
              </div>
            </div>
          )}

          {/* Schedule Configuration Section */}
          <div className="space-y-4">
            <h3 className="font-medium">{t("maintenance.scheduleStandard.scheduleConfig") || "Schedule Configuration"}</h3>

            <div className="space-y-2">
              <Label htmlFor="frequency">
                {t("maintenance.scheduleStandard.frequency") || "Frequency"} *
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue placeholder={t("maintenance.scheduleStandard.selectFrequency") || "Select frequency"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("maintenance.frequency.daily") || "Daily"}</SelectItem>
                  <SelectItem value="weekly">{t("maintenance.frequency.weekly") || "Weekly"}</SelectItem>
                  <SelectItem value="monthly">{t("maintenance.frequency.monthly") || "Monthly"}</SelectItem>
                  <SelectItem value="quarterly">{t("maintenance.frequency.quarterly") || "Quarterly"}</SelectItem>
                  <SelectItem value="yearly">{t("maintenance.frequency.yearly") || "Yearly"}</SelectItem>
                </SelectContent>
              </Select>
              {standardTemplate && (
                <p className="text-xs text-muted-foreground">
                  {t("maintenance.scheduleStandard.suggested") || "Suggested"}: {standardTemplate.suggested_frequency}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("maintenance.scheduleStandard.startDate") || "Start Date"} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate.toISOString()) : t("maintenance.scheduleStandard.pickDate") || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t("maintenance.scheduleStandard.endDate") || "End Date"} ({t("common.optional") || "Optional"})</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate.toISOString()) : t("maintenance.scheduleStandard.pickDate") || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">{t("maintenance.scheduleStandard.activeStatus") || "Active Status"}</Label>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={scheduleTaskMutation.isPending}>
              {scheduleTaskMutation.isPending
                ? (t("common.loading") || "Loading...")
                : (t("maintenance.scheduleStandard.scheduleButton") || "Schedule Task")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
