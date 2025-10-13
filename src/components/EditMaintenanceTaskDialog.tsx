import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface EditMaintenanceTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  scheduleId: string;
  initialData: {
    title: string;
    description: string;
    type: string;
    priority: string;
    startDate: string;
    endDate: string | null;
    frequency: string;
    isActive: boolean;
  };
}

export const EditMaintenanceTaskDialog = ({
  open,
  onOpenChange,
  templateId,
  scheduleId,
  initialData,
}: EditMaintenanceTaskDialogProps) => {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [type, setType] = useState(initialData.type);
  const [priority, setPriority] = useState(initialData.priority);
  const [startDate, setStartDate] = useState<Date>(parseISO(initialData.startDate));
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData.endDate ? parseISO(initialData.endDate) : undefined
  );
  const [frequency, setFrequency] = useState(initialData.frequency);
  const [isActive, setIsActive] = useState(initialData.isActive);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setType(initialData.type);
      setPriority(initialData.priority);
      setStartDate(parseISO(initialData.startDate));
      setEndDate(initialData.endDate ? parseISO(initialData.endDate) : undefined);
      setFrequency(initialData.frequency);
      setIsActive(initialData.isActive);
    }
  }, [open, initialData]);

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      // Update template
      const { error: templateError } = await supabase
        .from("ticket_templates")
        .update({
          title,
          description,
          type: type as any,
          priority: priority as any,
        })
        .eq("id", templateId);

      if (templateError) throw templateError;

      // Update schedule
      const { error: scheduleError } = await supabase
        .from("recurring_schedules")
        .update({
          frequency,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          is_active: isActive,
        })
        .eq("id", scheduleId);

      if (scheduleError) throw scheduleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules"] });
      toast({
        title: "Task updated",
        description: "Maintenance task has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating maintenance task:", error);
      toast({
        title: "Error",
        description: "Failed to update maintenance task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !type || !startDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (endDate && endDate < startDate) {
      toast({
        title: "Invalid dates",
        description: "End date cannot be before start date.",
        variant: "destructive",
      });
      return;
    }
    updateTaskMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Clean Swimming Pool"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the maintenance task..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Schedule Details</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
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
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
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
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2 mb-4">
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

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
