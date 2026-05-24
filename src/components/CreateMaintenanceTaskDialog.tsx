import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

const formSchema = z.object({
  title: z.string().min(1, { message: "maintenanceTask.titleRequired" }),
  description: z.string().optional(),
  type: z.enum(["repair", "maintenance", "inspection", "emergency"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export const CreateMaintenanceTaskDialog = ({ open, onOpenChange, propertyId, tenancyId }: CreateMaintenanceTaskDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", type: "repair", priority: "medium" },
  });

  useEffect(() => {
    if (open) form.reset({ title: "", description: "", type: "repair", priority: "medium" });
  }, [open, form]);

  const createTaskMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('maintenance_tasks')
        .insert([{
          property_id: propertyId,
          tenancy_id: tenancyId,
          title: values.title,
          description: values.description,
          type: values.type,
          priority: values.priority,
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
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('maintenanceTask.creationFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    createTaskMutation.mutate(values);
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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maintenanceTask.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('maintenanceTask.titlePlaceholder')} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('maintenanceTask.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('maintenanceTask.descriptionPlaceholder')} rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenanceTask.type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('maintenanceTask.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="repair">{t('maintenanceTask.repair')}</SelectItem>
                        <SelectItem value="maintenance">{t('maintenanceTask.maintenance')}</SelectItem>
                        <SelectItem value="inspection">{t('maintenanceTask.inspection')}</SelectItem>
                        <SelectItem value="emergency">{t('maintenanceTask.emergency')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maintenanceTask.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('maintenanceTask.selectPriority')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t('maintenanceTask.low')}</SelectItem>
                        <SelectItem value="medium">{t('maintenanceTask.medium')}</SelectItem>
                        <SelectItem value="high">{t('maintenanceTask.high')}</SelectItem>
                        <SelectItem value="urgent">{t('maintenanceTask.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
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
        </Form>
      </DialogContent>
    </Dialog>
  );
};
