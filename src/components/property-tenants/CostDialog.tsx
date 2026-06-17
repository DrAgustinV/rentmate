import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLanguage } from "@/contexts/LanguageContext";
import { dateToISODateString } from "@/lib/dateUtils";
import { Loader2 } from "lucide-react";
import type { PropertyCostDomain } from "@/types/domain";
import type { CreateCostInput, UpdateCostInput } from "@/services/costService";

const costCategories = ['community_fee', 'property_tax', 'maintenance', 'exceptional', 'insurance', 'other'] as const;
const recurrences = ['once', 'monthly', 'quarterly', 'yearly'] as const;
const statuses = ['pending', 'paid'] as const;

const formSchema = z.object({
  cost_category: z.string().min(1, "Field is required"),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "Must be a positive number" }),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
  status: z.string().min(1, "Field is required"),
  recurrence: z.string().min(1, "Field is required"),
  notes: z.string().optional(),
});

interface CostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  cost?: PropertyCostDomain | null;
  onSave: (input: CreateCostInput | UpdateCostInput) => Promise<void>;
  isSubmitting: boolean;
}

export const CostDialog = ({ open, onOpenChange, propertyId, cost, onSave, isSubmitting }: CostDialogProps) => {
  const { t } = useLanguage();
  const isEditing = !!cost;

  const defaultValues = useMemo(() => ({
    cost_category: cost?.costCategory || "",
    description: cost?.description || "",
    amount: cost ? (cost.amountCents / 100).toFixed(2) : "",
    due_date: cost?.dueDate || "",
    paid_date: cost?.paidDate || "",
    status: cost?.status || "pending",
    recurrence: cost?.recurrence || "once",
    notes: cost?.notes || "",
  }), [cost]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const amountCents = Math.round(parseFloat(values.amount) * 100);
    const input: CreateCostInput | UpdateCostInput = {
      ...(isEditing ? {} : { property_id: propertyId }),
      cost_category: values.cost_category,
      description: values.description || null,
      amount_cents: amountCents,
      due_date: values.due_date || null,
      paid_date: values.paid_date || null,
      status: values.status,
      recurrence: values.recurrence,
      notes: values.notes || null,
    };

    if (isEditing) {
      const update: UpdateCostInput = { ...input } as UpdateCostInput;
      await onSave(update);
    } else {
      await onSave(input as CreateCostInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("costs.editCost") : t("costs.createCost")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("costs.editCostDesc") : t("costs.createCostDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("costs.fields.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("costs.filters.allCategories")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {t(`costs.filters.${cat}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("costs.fields.amount")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0.00" autoFocus={!isEditing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("costs.fields.description")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("costs.fields.description")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("costs.fields.dueDate")}</FormLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                      onChange={(date) => field.onChange(date ? dateToISODateString(date) : "")}
                      placeholder={t("costs.selectDate")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paid_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("costs.fields.paidDate")}</FormLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                      onChange={(date) => field.onChange(date ? dateToISODateString(date) : "")}
                      placeholder={t("costs.selectDate")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("costs.fields.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("costs.filters.allStatuses")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`costs.filters.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("costs.fields.recurrence")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("costs.fields.once")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recurrences.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`costs.fields.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("costs.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("costs.fields.notes")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  isEditing ? t("common.save") : t("common.create")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
