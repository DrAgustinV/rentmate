import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import { useCreateUtilityPayment } from "@/hooks/useCreateUtilityPayment";
import { useCreateRentPayment } from "@/hooks/useCreateRentPayment";

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenancyId: string;
  defaultType?: 'utility' | 'rent';
}

export const CreatePaymentDialog = ({ open, onOpenChange, propertyId, tenancyId, defaultType = 'utility' }: CreatePaymentDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<'utility' | 'rent'>(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUtilityPayment = useCreateUtilityPayment();
  const createRentPayment = useCreateRentPayment();

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { type: 'utility' | 'rent'; payload: unknown }) => {
      if (data.type === 'utility') {
        return createUtilityPayment.mutateAsync(data.payload as any);
      }
      return createRentPayment.mutateAsync(data.payload as any);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('payment.created'),
      });
      queryClient.invalidateQueries({ queryKey: ['payments', propertyId, tenancyId] });
      onOpenChange(false);
      setAmount("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('payment.creationFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: t('common.error'),
        description: t('payment.invalidAmount'),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    await createPaymentMutation.mutateAsync({
      type: paymentType,
      payload: {
        property_id: propertyId,
        tenancy_id: tenancyId,
        amount: Number(amount),
        description,
      },
    });
    setIsSubmitting(false);
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
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">{t('payment.type')}</Label>
            <Select value={paymentType} onValueChange={(val: 'utility' | 'rent') => setPaymentType(val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('payment.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utility">{t('payment.utility')}</SelectItem>
                <SelectItem value="rent">{t('payment.rent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">{t('payment.amount')}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('payment.description')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('payment.descriptionPlaceholder')}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? (
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
      </DialogContent>
    </Dialog>
  );
};
