import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import { useCreateUtilityPayment } from "@/hooks/useCreateUtilityPayment";
import { useCreateRentPayment } from "@/hooks/useCreateRentPayment";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import type { UtilityType, UtilityPaymentStatus } from "@/types/domain";

const formSchema = z.object({
  type: z.enum(["utility", "rent"]),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: "payment.invalidAmount" }),
  notes: z.string().optional(),
});

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
  defaultType?: 'utility' | 'rent';
  defaultAmount?: string;
  fallbackAmountCents?: number | null;
}

export const CreatePaymentDialog = ({ open, onOpenChange, propertyId, tenancyId, defaultType = 'rent', defaultAmount, fallbackAmountCents }: CreatePaymentDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rentAgreements } = useRentAgreements(propertyId);

  const effectiveAmount = useMemo(() => {
    if (defaultAmount) return defaultAmount;
    const agreement = rentAgreements?.find(ra => ra.tenancy_id === tenancyId && ra.is_active);
    if (agreement?.rent_amount_cents) return (agreement.rent_amount_cents / 100).toFixed(2);
    if (fallbackAmountCents) return (fallbackAmountCents / 100).toFixed(2);
    return "";
  }, [defaultAmount, rentAgreements, tenancyId, fallbackAmountCents]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: { type: defaultType, amount: effectiveAmount, notes: "" },
  });

  const createUtilityPayment = useCreateUtilityPayment();
  const createRentPayment = useCreateRentPayment();

  const createPaymentMutation = useMutation({
    mutationFn: async ({ type, payload }: { type: 'utility' | 'rent'; payload: { property_id: string; tenancy_id: string; amount: number; notes?: string } }) => {
      if (type === 'utility') {
        return createUtilityPayment.mutateAsync({
          property_id: payload.property_id,
          type: 'electricity' as UtilityType,
          amount_cents: payload.amount,
          currency: 'EUR',
          status: 'pending' as UtilityPaymentStatus,
          payment_due_date: new Date().toISOString().split('T')[0],
          provider: 'manual',
        });
      }
      return createRentPayment.mutateAsync({
        property_id: payload.property_id,
        tenancy_id: payload.tenancy_id,
        tenant_id: '',
        amount_cents: payload.amount,
        currency: 'EUR',
        status: 'pending',
        payment_due_date: new Date().toISOString().split('T')[0],
        notes: payload.notes,
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('payment.created'),
      });
      queryClient.invalidateQueries({ queryKey: ['payments', propertyId, tenancyId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message || t('payment.creationFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await createPaymentMutation.mutateAsync({
      type: values.type,
      payload: {
        property_id: propertyId,
        tenancy_id: tenancyId,
        amount: Number(values.amount),
        notes: values.notes,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('payment.createPayment')}</DialogTitle>
          <DialogDescription>
            {t('payment.createPaymentDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('payment.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('payment.selectType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="utility">{t('payment.utility')}</SelectItem>
                      <SelectItem value="rent">{t('payment.rent')}</SelectItem>
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
                  <FormLabel>{t('payment.amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('payment.notes')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('payment.notesPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                  t('payment.createPayment')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
