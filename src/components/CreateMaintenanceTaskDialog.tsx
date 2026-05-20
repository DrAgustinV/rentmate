import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CreateMaintenanceTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
}

export const CreateMaintenanceTaskDialog = ({ open, onOpenChange, propertyId, tenancyId }: CreateMaintenanceTaskDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("repair");
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('maintenance_tasks')
        .insert([{
          property_id: propertyId,
          tenancy_id: tenancyId,
          title,
          description,
          type: type as string,
          priority: priority as string,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('maintenanceTask.created'),
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks', propertyId, tenancyId] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setType("repair");
      setPriority("medium");
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('maintenanceTask.creationFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: t('common.error'),
        description: t('maintenanceTask.titleRequired'),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    await createTaskMutation.mutateAsync();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('maintenanceTask.createTask')}</DialogTitle>
          <DialogDescription>
            {t('maintenanceTask.createTaskDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('maintenanceTask.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('maintenanceTask.titlePlaceholder')}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('maintenanceTask.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('maintenanceTask.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('maintenanceTask.type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('maintenanceTask.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">{t('maintenanceTask.repair')}</SelectItem>
                  <SelectItem value="maintenance">{t('maintenanceTask.maintenance')}</SelectItem>
                  <SelectItem value="inspection">{t('maintenanceTask.inspection')}</SelectItem>
                  <SelectItem value="emergency">{t('maintenanceTask.emergency')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">{t('maintenanceTask.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder={t('maintenanceTask.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('maintenanceTask.low')}</SelectItem>
                  <SelectItem value="medium">{t('maintenanceTask.medium')}</SelectItem>
                  <SelectItem value="high">{t('maintenanceTask.high')}</SelectItem>
                  <SelectItem value="urgent">{t('maintenanceTask.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.creating')}
                </>
              ) : (
                t('maintenanceTask.createTask')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
