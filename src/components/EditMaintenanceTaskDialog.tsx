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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

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
        title: t('maintenance.editTask.taskUpdated'),
        description: t('maintenance.editTask.updateSuccess'),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating maintenance task:", error);
      toast({
        title: t('maintenance.createTask.error'),
        description: t('maintenance.editTask.updateError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !type || !startDate) {
      toast({
        title: t('maintenance.createTask.missingFields'),
        description: t('maintenance.createTask.missingFieldsMessage'),
        variant: "destructive",
      });
      return;
    }
    if (endDate && endDate < startDate) {
      toast({
        title: t('maintenance.editTask.invalidDates'),
        description: t('maintenance.editTask.invalidDatesMessage'),
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
          <DialogTitle>{t('maintenance.editTask.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('maintenance.createTask.taskTitle')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('maintenance.createTask.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('maintenance.createTask.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('maintenance.createTask.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('maintenance.createTask.type')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('maintenance.createTask.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">{t('maintenance.createTask.types.maintenance')}</SelectItem>
                    <SelectItem value="repair">{t('maintenance.createTask.types.repair')}</SelectItem>
                    <SelectItem value="inspection">{t('maintenance.createTask.types.inspection')}</SelectItem>
                    <SelectItem value="cleaning">{t('maintenance.createTask.types.cleaning')}</SelectItem>
                    <SelectItem value="other">{t('maintenance.createTask.types.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">{t('maintenance.createTask.priority')}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('maintenance.createTask.priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('maintenance.createTask.priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('maintenance.createTask.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('maintenance.createTask.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">{t('maintenance.createTask.scheduleDetails')}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>{t('maintenance.createTask.startDate')}</Label>
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
                        {startDate ? format(startDate, "PPP") : t('maintenance.createTask.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{t('maintenance.createTask.endDate')}</Label>
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
                        {endDate ? format(endDate, "PPP") : t('maintenance.createTask.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="frequency">{t('maintenance.createTask.frequency')}</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('maintenance.createTask.frequencies.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('maintenance.createTask.frequencies.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('maintenance.createTask.frequencies.monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('maintenance.createTask.frequencies.quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('maintenance.createTask.frequencies.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">{t('maintenance.createTask.active')}</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? t('maintenance.editTask.saving') : t('maintenance.editTask.saveButton')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
