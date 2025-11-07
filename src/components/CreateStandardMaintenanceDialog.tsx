import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      
      toast.success("Standard maintenance template created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating standard maintenance template:", error);
      toast.error("Failed to create template");
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
      toast.error("Please fill in all required fields");
      return;
    }
    createTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Standard Maintenance Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Template Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Annual HVAC Inspection"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of what this maintenance task involves..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., HVAC, Plumbing, Electrical, Safety"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select value={type} onValueChange={setType} required>
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

            <div className="space-y-2">
              <Label htmlFor="frequency">Suggested Frequency</Label>
              <Select value={suggestedFrequency} onValueChange={setSuggestedFrequency}>
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
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
