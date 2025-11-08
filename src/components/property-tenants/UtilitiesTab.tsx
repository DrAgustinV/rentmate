import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { UtilityPaymentHistory } from "@/components/payments/UtilityPaymentHistory";
import { CreateUtilityPaymentDialog } from "@/components/CreateUtilityPaymentDialog";

interface Tenant {
  id: string;
  tenant_id: string;
  started_at: string;
  ended_at: string | null;
  tenancy_status: string;
  tenant?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface UtilitiesTabProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: 'manager' | 'tenant' | null;
}

export function UtilitiesTab({ currentTenant, propertyId, userRole }: UtilitiesTabProps) {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!currentTenant || !userRole) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("utilities.noActiveTenant")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {userRole === 'manager' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("utilities.manageUtilities")}</CardTitle>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("utilities.addUtilityBill")}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <UtilityPaymentHistory
        propertyId={propertyId}
        isManager={userRole === 'manager'}
      />

      <CreateUtilityPaymentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        propertyId={propertyId}
        tenantId={currentTenant.tenant_id}
      />
    </div>
  );
}
