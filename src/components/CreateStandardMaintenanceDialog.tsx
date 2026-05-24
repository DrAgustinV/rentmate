import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import type { Database } from "@/integrations/supabase/types";

interface StandardTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  suggested_frequency: string;
  category: string;
}

interface CreateStandardMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: StandardTemplate | null;
}

export const CreateStandardMaintenanceDialog = ({
  open,
  onOpenChange,
  template,
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

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
      setType(template.type);
      setPriority(template.priority);
      setCategory(template.category);
      setSuggestedFrequency(template.suggested_frequency);
    } else {
      resetForm();
    }
  }, [template, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await authService.getCurrentUser();

      if (!user) throw new Error("Not authenticated");

      if (isEditing && template) {
        const { data, error } = await supabase
          .from("standard_maintenance_templates")
          .update({
            title,
            description,
            type: type as Database["public"]["Enums"]["ticket_type"],
            priority: priority as Database["public"]["Enums"]["ticket_priority"],
            category,
            suggested_frequency: suggestedFrequency,
          })
          .eq("id", template.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("standard_maintenance_templates")
          .insert([{
            title,
            description,
            type: type as Database["public"]["Enums"]["ticket_type"],
            priority: priority as Database["public"]["Enums"]["ticket_priority"],
            category,
            suggested_frequency: suggestedFrequency,
            is_active: true,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["standard-maintenance-templates"] });

      if (isEditing) {
        trackEvent({
          eventName: 'standard_maintenance_template_updated',
          category: 'maintenance',
          metadata: {
            template_id: data.id,
            type: type,
            category: category,
          },
        });
        toast.success(t('maintenance.templates.updateSuccess') || t('configuration.standardMaintenance.templateCreated'));
      } else {
        trackEvent({
          eventName: 'standard_maintenance_template_created',
          category: 'maintenance',
          metadata: {
            template_id: data.id,
            type: type,
            category: category,
          },
        });
        toast.success(t('configuration.standardMaintenance.templateCreated'));
      }

      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error saving standard maintenance template:", error);
      toast.error(isEditing
        ? (t('maintenance.templates.updateFailed') || t('configuration.standardMaintenance.templateFailed'))
        : t('configuration.standardMaintenance.templateFailed'));
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
    if (!title.trim() || !type || !category) {
      toast.error(t('dialogs.pleaseFillRequired'));
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('maintenance.templates.editTemplate') : t('configuration.standardMaintenance.createTemplate')}</DialogTitle>
          <DialogDescription>
            {t('configuration.standardMaintenance.standardMaintenanceDesc')}
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('configuration.standardMaintenance.templateTitle')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('configuration.standardMaintenance.templateTitlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('configuration.standardMaintenance.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('configuration.standardMaintenance.descriptionPlaceholder')}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('configuration.standardMaintenance.category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={t('configuration.standardMaintenance.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hvac">{t('configuration.standardMaintenance.categories.hvac')}</SelectItem>
                    <SelectItem value="plumbing">{t('configuration.standardMaintenance.categories.plumbing')}</SelectItem>
                    <SelectItem value="electrical">{t('configuration.standardMaintenance.categories.electrical')}</SelectItem>
                    <SelectItem value="structural">{t('configuration.standardMaintenance.categories.structural')}</SelectItem>
                    <SelectItem value="safety">{t('configuration.standardMaintenance.categories.safety')}</SelectItem>
                    <SelectItem value="landscaping">{t('configuration.standardMaintenance.categories.landscaping')}</SelectItem>
                    <SelectItem value="appliance">{t('configuration.standardMaintenance.categories.appliance')}</SelectItem>
                    <SelectItem value="general">{t('configuration.standardMaintenance.categories.general')}</SelectItem>
                    <SelectItem value="cleaning">{t('configuration.standardMaintenance.categories.cleaning')}</SelectItem>
                    <SelectItem value="painting">{t('configuration.standardMaintenance.categories.painting')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('configuration.standardMaintenance.type')}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('configuration.standardMaintenance.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">{t('configuration.standardMaintenance.types.maintenance')}</SelectItem>
                    <SelectItem value="repair">{t('configuration.standardMaintenance.types.repair')}</SelectItem>
                    <SelectItem value="inspection">{t('configuration.standardMaintenance.types.inspection')}</SelectItem>
                    <SelectItem value="cleaning">{t('configuration.standardMaintenance.types.cleaning')}</SelectItem>
                    <SelectItem value="other">{t('configuration.standardMaintenance.types.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">{t('configuration.standardMaintenance.priority')}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('configuration.standardMaintenance.priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('configuration.standardMaintenance.priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('configuration.standardMaintenance.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('configuration.standardMaintenance.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">{t('configuration.standardMaintenance.suggestedFrequency')}</Label>
                <Select value={suggestedFrequency} onValueChange={setSuggestedFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('configuration.standardMaintenance.frequencies.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('configuration.standardMaintenance.frequencies.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('configuration.standardMaintenance.frequencies.monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('configuration.standardMaintenance.frequencies.quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('configuration.standardMaintenance.frequencies.yearly')}</SelectItem>
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
            disabled={mutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t('dialogs.saving') : (isEditing ? t('common.save') : t('configuration.standardMaintenance.createTemplate'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
