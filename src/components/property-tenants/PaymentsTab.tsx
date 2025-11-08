import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro } from "lucide-react";
import { CreateRentAgreementDrawer } from "@/components/CreateRentAgreementDrawer";
import { EditRentAgreementDrawer } from "@/components/EditRentAgreementDrawer";
import { RentPaymentHistory } from "@/components/payments/RentPaymentHistory";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface ContractSignature {
  tenancy_id: string;
  workflow_status: string;
}

interface PaymentsTabProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
  rentAgreements: any[] | undefined;
  agreementsLoading: boolean;
  contractSignatures: ContractSignature[] | undefined;
}

export function PaymentsTab({
  currentTenant,
  propertyId,
  userRole,
  rentAgreements,
  agreementsLoading,
  contractSignatures,
}: PaymentsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;

  console.log('[PaymentsTab] Rendering with:', {
    currentTenant: currentTenant?.id,
    propertyId,
    userRole,
    rentAgreementsCount: rentAgreements?.length,
    agreementsLoading
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t("rentAgreements.monthlyRent")}</h3>
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
                      <span className="capitalize">{agreement.mandate_status}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          
          {/* Payment History - Always show */}
          <RentPaymentHistory 
            propertyId={propertyId} 
            isManager={isManager}
            hasRentAgreement={rentAgreements.some(ra => ra.tenancy_id === currentTenant.id)}
          />
        </div>
      )}
    </div>
  );
}
