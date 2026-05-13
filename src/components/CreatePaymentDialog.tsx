import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUtilityPaymentMutations } from "@/hooks/useUtilityPayments";
import { useRentPaymentMutations } from "@/hooks/useRentPayments";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenantId?: string;
  managerId: string;
  isManager: boolean;
}

const utilityTypes = ['electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other'] as const;

export function CreatePaymentDialog({
  open,
  onOpenChange,
  propertyId,
  tenantId,
  managerId,
  isManager,
}: CreatePaymentDialogProps) {
  const { t } = useLanguage();
  const { createPayment: createUtilityPayment } = useUtilityPaymentMutations();
  const { createPayment: createRentPayment } = useRentPaymentMutations();
  const { data: rentAgreements } = useRentAgreements(propertyId);

  const [paymentType, setPaymentType] = useState<'rent' | 'utility'>('utility');
  const [utilityType, setUtilityType] = useState<typeof utilityTypes[number]>('electricity');
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingStart, setBillingStart] = useState("");
  const [billingEnd, setBillingEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedRentAgreement, setSelectedRentAgreement] = useState("");
  const [managerIdState, setManagerIdState] = useState(managerId);

  useEffect(() => {
    if (!managerId) {
      const fetchManagerId = async () => {
        const { data } = await supabase
          .from('properties')
          .select('manager_id')
          .eq('id', propertyId)
          .single();
        
        if (data) {
          setManagerIdState(data.manager_id);
        }
      };
      fetchManagerId();
    }
  }, [propertyId, managerId]);

  const activeRentAgreement = rentAgreements?.find(ra => 
    (tenantId ? ra.tenant_id === tenantId : true) && ra.is_active
  );

  useEffect(() => {
    if (activeRentAgreement && paymentType === 'rent') {
      setSelectedRentAgreement(activeRentAgreement.id);
    }
  }, [activeRentAgreement, paymentType]);

  const resetForm = () => {
    setPaymentType('utility');
    setUtilityType('electricity');
    setCustomName("");
    setAmount("");
    setBillingStart("");
    setBillingEnd("");
    setDueDate("");
  };

  const handleSubmit = async () => {
    try {
      if (paymentType === 'utility') {
        createUtilityPayment.mutate(
          {
            property_id: propertyId,
            tenant_id: tenantId || null,
            manager_id: managerIdState,
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
              resetForm();
              onOpenChange(false);
            },
          }
        );
      } else {
        if (!selectedRentAgreement) {
          toast.error(t("payments.createRentPayment") + ": " + t("common.error"));
          return;
        }
        createRentPayment.mutate(
          {
            rent_agreement_id: selectedRentAgreement,
            property_id: propertyId,
            tenant_id: tenantId || activeRentAgreement?.tenant_id || null,
            manager_id: managerIdState,
            amount_cents: Math.round(parseFloat(amount) * 100),
            currency: 'eur',
            payment_due_date: dueDate,
            status: 'pending',
            payment_method: 'manual',
          },
          {
            onSuccess: () => {
              resetForm();
              onOpenChange(false);
            },
          }
        );
      }
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };

  const canCreateRentPayment = activeRentAgreement || rentAgreements?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("payments.createPayment")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("payments.filters.type")}</Label>
            <Select value={paymentType} onValueChange={(value: 'rent' | 'utility') => setPaymentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utility">{t("payments.filters.utility")}</SelectItem>
                <SelectItem value="rent" disabled={!canCreateRentPayment}>
                  {t("payments.filters.rent")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === 'utility' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="utility-type">{t("utilities.utilityType")}</Label>
                <Select value={utilityType} onValueChange={(value: typeof utilityTypes[number]) => setUtilityType(value)}>
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
                  <Label htmlFor="custom-name">{t("utilities.customName")}</Label>
                  <Input
                    id="custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={t("utilities.customNamePlaceholder")}
                  />
                </div>
              )}
            </>
          )}

          {paymentType === 'rent' && rentAgreements && rentAgreements.length > 0 && (
            <div className="space-y-2">
              <Label>{t("rentAgreements.title")}</Label>
              <Select value={selectedRentAgreement} onValueChange={setSelectedRentAgreement}>
                <SelectTrigger>
                  <SelectValue placeholder={t("rentAgreements.selectAgreement")} />
                </SelectTrigger>
                <SelectContent>
                  {rentAgreements.map((ra) => (
                    <SelectItem key={ra.id} value={ra.id}>
                      {ra.monthly_rent_cents 
                        ? `€${(ra.monthly_rent_cents / 100).toFixed(2)}/month`
                        : t("rentAgreements.rentAgreement")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{t("common.amount")} (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {paymentType === 'utility' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing-start">{t("utilities.billingPeriodStart")}</Label>
                <Input
                  id="billing-start"
                  type="date"
                  value={billingStart}
                  onChange={(e) => setBillingStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-end">{t("utilities.billingPeriodEnd")}</Label>
                <Input
                  id="billing-end"
                  type="date"
                  value={billingEnd}
                  onChange={(e) => setBillingEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="due-date">{t("utilities.dueDate")}</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            resetForm();
            onOpenChange(false);
          }}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !amount ||
              !dueDate ||
              (paymentType === 'utility' && utilityType === 'other' && !customName) ||
              (paymentType === 'utility' && !billingStart) ||
              (paymentType === 'utility' && !billingEnd) ||
              (paymentType === 'rent' && !selectedRentAgreement) ||
              createUtilityPayment.isPending ||
              createRentPayment.isPending
            }
          >
            {createUtilityPayment.isPending || createRentPayment.isPending 
              ? t("common.creating") 
              : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePaymentDialog;