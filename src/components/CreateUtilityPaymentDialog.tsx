import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";

interface CreateUtilityPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId: string | null;
  managerId: string;
}

const utilityTypes = ['electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other'] as const;

export function CreateUtilityPaymentDialog({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  managerId,
}: CreateUtilityPaymentDialogProps) {
  const { t } = useLanguage();
  const { createPayment } = useUtilityPaymentMutations();
  const [utilityType, setUtilityType] = useState<typeof utilityTypes[number]>('electricity');
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingStart, setBillingStart] = useState("");
  const [billingEnd, setBillingEnd] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async () => {
    createPayment.mutate(
      {
        property_id: propertyId,
        tenant_id: tenantId,
        manager_id: managerId,
        utility_type: utilityType,
        custom_utility_name: utilityType === 'other' ? customName : undefined,
        amount_cents: Math.round(parseFloat(amount) * 100),
        currency: 'eur',
        billing_period_start: billingStart,
        billing_period_end: billingEnd,
        payment_due_date: dueDate,
        status: 'pending',
      },
      {
        onSuccess: () => {
          setUtilityType('electricity');
          setCustomName("");
          setAmount("");
          setBillingStart("");
          setBillingEnd("");
          setDueDate("");
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

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="utility-type">{t("utilityPayments.utilityType")}</Label>
            <Select value={utilityType} onValueChange={(value: any) => setUtilityType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {utilityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`utilities.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {utilityType === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-name">{t("utilityPayments.customName")}</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t("utilityPayments.customNamePlaceholder")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{t("utilityPayments.amount")} (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing-start">{t("utilityPayments.billingPeriodStart")}</Label>
              <Input
                id="billing-start"
                type="date"
                value={billingStart}
                onChange={(e) => setBillingStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-end">{t("utilityPayments.billingPeriodEnd")}</Label>
              <Input
                id="billing-end"
                type="date"
                value={billingEnd}
                onChange={(e) => setBillingEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">{t("utilityPayments.dueDate")}</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !amount ||
              !billingStart ||
              !billingEnd ||
              !dueDate ||
              (utilityType === 'other' && !customName) ||
              createPayment.isPending
            }
          >
            {createPayment.isPending ? t("common.creating") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
