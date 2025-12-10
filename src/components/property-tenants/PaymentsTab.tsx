import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Plus } from "lucide-react";
import { useState } from "react";
import { CreateRentAgreementDrawer } from "@/components/CreateRentAgreementDrawer";
import { EditRentAgreementDrawer } from "@/components/EditRentAgreementDrawer";
import { RentPaymentHistory } from "@/components/payments/RentPaymentHistory";
import { UtilityPaymentHistory } from "@/components/payments/UtilityPaymentHistory";
import { CreateUtilityPaymentDialog } from "@/components/CreateUtilityPaymentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { supabase } from "@/integrations/supabase/client";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
}

interface PaymentsTabProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
}

export function PaymentsTab({
  currentTenant,
  propertyId,
  userRole,
}: PaymentsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;
  const [createUtilityDialogOpen, setCreateUtilityDialogOpen] = useState(false);

  // Lazy-loaded queries - only fetched when PaymentsTab is rendered
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);

  const { data: contractSignatures } = useQuery({
    queryKey: ['contract-signatures', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('tenancy_id, workflow_status')
        .eq('property_id', propertyId)
        .in('workflow_status', ['pending', 'in_progress']);
      
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  // Show for both managers and tenants
  if (!currentTenant) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t("dialogs.manageTenants.noTenants")}</p>
        <p className="text-sm mt-2">{t("properties.inviteTenantToGetStarted")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rent Payments Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("propertyHub.rentPayments")}</CardTitle>
            {isManager && !rentAgreements?.some(ra => ra.tenancy_id === currentTenant.id && ra.is_active) && (
              <CreateRentAgreementDrawer
                propertyId={propertyId}
                activeTenant={{
                  id: currentTenant.id,
                  tenant_id: currentTenant.tenant_id,
                  profiles: {
                    first_name: currentTenant.first_name,
                    last_name: currentTenant.last_name,
                    email: currentTenant.email,
                  }
                }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {agreementsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !rentAgreements || rentAgreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2 border rounded-lg">
              <Euro className="h-10 w-10 mx-auto opacity-50" />
              <p className="text-sm">{t("rentAgreements.noAgreements")}</p>
              <p className="text-xs">{t("rentAgreements.createFirst")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rentAgreements
                .filter(agreement => agreement.tenancy_id === currentTenant.id)
                .map((agreement) => (
                  <div key={agreement.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {agreement.tenant.first_name || ''} {agreement.tenant.last_name || ''} {agreement.tenant.email}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{t("rentAgreements.monthlyRent")}: €{(agreement.rent_amount_cents / 100).toFixed(2)}</span>
                          <span>{t("rentAgreements.paymentDay")}: {agreement.payment_day}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={agreement.is_active ? "default" : "secondary"}>
                          {agreement.is_active ? t("rentAgreements.active") : t("rentAgreements.pending")}
                        </Badge>
                        {isManager && (
                          <EditRentAgreementDrawer 
                            agreement={agreement}
                            isContractSigning={!!contractSignatures?.some(sig => sig.tenancy_id === agreement.tenancy_id)}
                          />
                        )}
                      </div>
                    </div>
                    {!agreement.tenant_iban && (
                      <div className="text-sm text-muted-foreground">
                        {t("rentAgreements.setupPayment")}
                      </div>
                    )}
                    {agreement.tenant_iban && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("rentAgreements.iban")}: </span>
                          <span className="font-mono">{agreement.tenant_iban.replace(/(.{4})/g, '$1 ').trim().slice(0, 20)}...</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("rentAgreements.mandateStatus")}: </span>
                          <span className="capitalize">{t(`rentAgreements.mandateStatus.${agreement.mandate_status}`)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              
              {/* Payment History */}
              <RentPaymentHistory 
                propertyId={propertyId} 
                isManager={isManager}
                hasRentAgreement={rentAgreements.some(ra => ra.tenancy_id === currentTenant.id)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utility Payments Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("propertyHub.utilityPayments")}</CardTitle>
            {isManager && (
              <Button onClick={() => setCreateUtilityDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("utilities.addUtilityBill")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <UtilityPaymentHistory
            propertyId={propertyId}
            isManager={isManager}
          />
        </CardContent>
      </Card>

      {/* Utility Payment Dialog */}
      <CreateUtilityPaymentDialog
        open={createUtilityDialogOpen}
        onOpenChange={setCreateUtilityDialogOpen}
        propertyId={propertyId}
        tenantId={currentTenant.tenant_id}
      />
    </div>
  );
}
