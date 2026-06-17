import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { dateToISODateString } from "@/lib/dateUtils";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";

interface CreateUtilityPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string | null;
  managerId: string;
}

const utilityTypes = ['electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other'] as const;

const formSchema = z.object({
  utilityType: z.enum(utilityTypes),
  customName: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "Valid amount required" }),
  billingStart: z.string().min(1, { message: "Required" }),
  billingEnd: z.string().min(1, { message: "Required" }),
  dueDate: z.string().min(1, { message: "Required" }),
}).refine(
  (data) => data.utilityType !== 'other' || (data.customName && data.customName.length > 0),
  { message: "Required for custom type", path: ["customName"] }
);

export function CreateUtilityPaymentDialog({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  managerId,
}: CreateUtilityPaymentDialogProps) {
  const { t } = useLanguage();
  const { createPayment } = useUtilityPaymentMutations();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      utilityType: 'electricity',
      customName: "",
      amount: "",
      billingStart: "",
      billingEnd: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open) form.reset({
      utilityType: 'electricity',
      customName: "",
      amount: "",
      billingStart: "",
      billingEnd: "",
      dueDate: "",
    });
  }, [open, form]);

  const watchedType = form.watch("utilityType");

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    createPayment.mutate(
      {
        property_id: propertyId,
        tenant_id: tenantId,
        manager_id: managerId,
        utility_type: values.utilityType,
        custom_utility_name: values.utilityType === 'other' ? values.customName : undefined,
        amount_cents: Math.round(parseFloat(values.amount) * 100),
        currency: 'eur',
        billing_period_start: values.billingStart,
        billing_period_end: values.billingEnd,
        payment_due_date: values.dueDate,
        status: 'pending',
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("utilityPayments.addUtilityBill")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="utilityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("utilityPayments.utilityType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {utilityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`utilities.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'other' && (
              <FormField
                control={form.control}
                name="customName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("utilityPayments.customName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("utilityPayments.customNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("utilityPayments.amount")} (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("utilityPayments.billingPeriodStart")}</FormLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                      onChange={(date) => field.onChange(date ? dateToISODateString(date) : "")}
                      placeholder={t("utilityPayments.selectDate")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("utilityPayments.billingPeriodEnd")}</FormLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                      onChange={(date) => field.onChange(date ? dateToISODateString(date) : "")}
                      placeholder={t("utilityPayments.selectDate")}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("utilityPayments.dueDate")}</FormLabel>
                  <DatePicker
                    value={field.value ? new Date(field.value + "T00:00:00") : undefined}
                    onChange={(date) => field.onChange(date ? dateToISODateString(date) : "")}
                    placeholder={t("utilityPayments.selectDate")}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? t("common.creating") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
