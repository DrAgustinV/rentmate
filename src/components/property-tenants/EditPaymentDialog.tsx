import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import type { UnifiedPayment } from "@/components/payments/UnifiedPaymentHistory";

const statuses = ['pending', 'paid', 'overdue'] as const;

const formSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "Must be a positive number" }),
  dueDate: z.string().min(1, "Field is required"),
  status: z.string().min(1, "Field is required"),
  notes: z.string().optional(),
});

interface EditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: UnifiedPayment;
  onSave: (updates: { amountCents: number; dueDate: string; status: string; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function EditPaymentDialog({ open, onOpenChange, payment, onSave, isSubmitting }: EditPaymentDialogProps) {
  const { t } = useLanguage();

  const defaultValues = useMemo(() => ({
    amount: (payment.amountCents / 100).toFixed(2),
    dueDate: payment.dueDate,
    status: payment.status,
    notes: ((payment.data as Record<string, unknown>).notes as string) || "",
  }), [payment]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const amountCents = Math.round(parseFloat(values.amount) * 100);
    await onSave({
      amountCents,
      dueDate: values.dueDate,
      status: values.status,
      notes: values.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t("payments.editTitle")}</DialogTitle>
          <DialogDescription>{t("payments.editDesc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.amount")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.dueDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === 'pending' ? t("payments.filters.pending") : s === 'paid' ? t("payments.status.paid") : t("payments.filters.overdue")}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("costs.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
                  t("common.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
