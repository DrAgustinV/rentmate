import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface CreateStandardMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateStandardMaintenanceDialog = ({
  open,
  onOpenChange,
}: CreateStandardMaintenanceDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [category, setCategory] = useState<string>("");
  const [suggestedFrequency, setSuggestedFrequency] = useState<string>("monthly");

  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("standard_maintenance_templates")
        .insert([{
          title,
          description,
          type: type as any,
          priority: priority as any,
          category,
          suggested_frequency: suggestedFrequency,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["standard-maintenance-templates"] });
      
      trackEvent({
        event_name: 'standard_maintenance_template_created',
        event_category: 'maintenance',
        event_metadata: {
          template_id: data.id,
          type: type,
          category: category,
        },
      });
      
      toast.success(t('standardMaintenance.templateCreated'));
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating standard maintenance template:", error);
      toast.error(t('standardMaintenance.templateFailed'));
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("");
    setPriority("medium");
    setCategory("");
    setSuggestedFrequency("monthly");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !type || !category || !description.trim()) {
      toast.error(t('dialogs.pleaseFillRequired'));
      return;
    }
    createTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('standardMaintenance.createTemplate')}</DialogTitle>
          <DialogDescription>
            {t('configuration.standardMaintenanceDesc')}
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('standardMaintenance.templateTitle')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('standardMaintenance.templateTitlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('standardMaintenance.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('standardMaintenance.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('standardMaintenance.category')}</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('standardMaintenance.categoryPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('standardMaintenance.type')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('standardMaintenance.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">{t('standardMaintenance.types.maintenance')}</SelectItem>
                    <SelectItem value="repair">{t('standardMaintenance.types.repair')}</SelectItem>
                    <SelectItem value="inspection">{t('standardMaintenance.types.inspection')}</SelectItem>
                    <SelectItem value="cleaning">{t('standardMaintenance.types.cleaning')}</SelectItem>
                    <SelectItem value="other">{t('standardMaintenance.types.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">{t('standardMaintenance.priority')}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('standardMaintenance.priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('standardMaintenance.priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('standardMaintenance.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('standardMaintenance.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">{t('standardMaintenance.suggestedFrequency')}</Label>
                <Select value={suggestedFrequency} onValueChange={setSuggestedFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('standardMaintenance.frequencies.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('standardMaintenance.frequencies.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('standardMaintenance.frequencies.monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('standardMaintenance.frequencies.quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('standardMaintenance.frequencies.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createTemplateMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createTemplateMutation.isPending}
          >
            {createTemplateMutation.isPending ? t('dialogs.creating') : t('standardMaintenance.createTemplate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};