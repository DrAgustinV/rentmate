import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { showToast } from "@/lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface CreateRecurringScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function CreateRecurringScheduleDialog({
  open,
  onOpenChange,
  propertyId,
}: CreateRecurringScheduleDialogProps) {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: templates } = useQuery({
    queryKey: ["ticket-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_templates")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      if (!startDate) throw new Error("Start date is required");

      const { data, error } = await supabase
        .from("recurring_schedules")
        .insert({
          template_id: templateId,
          property_id: propertyId,
          frequency,
          start_date: format(startDate, "yyyy-MM-dd"),
          next_run_date: format(startDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules"] });
      showToast.success("Recurring schedule created");
      onOpenChange(false);
      setTemplateId("");
      setFrequency("monthly");
      setStartDate(undefined);
      setEndDate(undefined);
    },
    onError: (error) => {
      console.error("Error creating schedule:", error);
      showToast.error("Failed to create schedule");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !startDate) {
      showToast.error("Please select a template and start date");
      return;
    }
    createScheduleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Recurring Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
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
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
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
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createScheduleMutation.isPending}>
              {createScheduleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
