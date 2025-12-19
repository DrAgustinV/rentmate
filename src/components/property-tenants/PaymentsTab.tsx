import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Clock, Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";
import { CreateRentAgreementDrawer } from "@/components/CreateRentAgreementDrawer";
import { RentPaymentHistory } from "@/components/payments/RentPaymentHistory";
import { UtilityPaymentHistory } from "@/components/payments/UtilityPaymentHistory";
import { CreateUtilityPaymentDialog } from "@/components/CreateUtilityPaymentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { useTenancyStarted } from "@/hooks/useTenancyStarted";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  const [managerId, setManagerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if tenancy has started
  const { isStarted, formattedStartDate } = useTenancyStarted(propertyId, currentTenant?.id);

  // Lazy-loaded queries - only fetched when PaymentsTab is rendered
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);

  // Fetch manager ID for the property (needed when tenant creates utility bill)
  useEffect(() => {
    const fetchManagerId = async () => {
      const { data } = await supabase
        .from('properties')
        .select('manager_id')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        setManagerId(data.manager_id);
      }
    };
    fetchManagerId();
  }, [propertyId]);

  // Mutation to toggle auto reminders
  const toggleRemindersMutation = useMutation({
    mutationFn: async ({ agreementId, enabled }: { agreementId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('rent_agreements')
        .update({ auto_reminders_enabled: enabled })
        .eq('id', agreementId);
      
      if (error) throw error;
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['rent-agreements', propertyId] });
      toast.success(enabled ? t("payments.remindersEnabled") : t("payments.remindersDisabled"));
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
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

  const currentAgreement = rentAgreements?.find(ra => ra.tenancy_id === currentTenant.id && ra.is_active);

  // Tenant can add utility bills when tenancy is active
  const canAddUtilityBill = !isManager && isStarted && managerId;

  return (
    <div className="space-y-6">
      {/* Notice when tenancy hasn't started */}
      {!isStarted && formattedStartDate && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{t("payments.availableAfterStart")} {formattedStartDate}</span>
        </div>
      )}

      {/* Rent Payments Card */}
      <Card className="card-shine">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("propertyHub.rentPayments")}</CardTitle>
            <div className="flex items-center gap-3">
              {/* Auto Reminders Toggle - Manager Only, only if agreement exists */}
              {isManager && currentAgreement && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        {(currentAgreement as any).auto_reminders_enabled !== false ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={(currentAgreement as any).auto_reminders_enabled !== false}
                          onCheckedChange={(checked) => 
                            toggleRemindersMutation.mutate({ agreementId: currentAgreement.id, enabled: checked })
                          }
                          disabled={toggleRemindersMutation.isPending}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("payments.autoReminders")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* Create button - Manager Only, no agreement */}
              {isManager && !currentAgreement && (
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
          </div>
        </CardHeader>
        <CardContent>
          {agreementsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !rentAgreements || rentAgreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2 border rounded-lg">
              <p className="text-sm">{t("rentAgreements.noAgreements")}</p>
              <p className="text-xs">{t("rentAgreements.createFirst")}</p>
            </div>
          ) : (
            <RentPaymentHistory 
              propertyId={propertyId} 
              isManager={isManager}
              hasRentAgreement={!!currentAgreement}
              rentAgreementId={currentAgreement?.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Utility Payments Card */}
      <Card className="card-shine">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("propertyHub.utilityPayments")}</CardTitle>
            {/* Add Bill button - Tenant only when tenancy is active */}
            {canAddUtilityBill && (
              <Button 
                onClick={() => setCreateUtilityDialogOpen(true)}
              >
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
      {managerId && (
        <CreateUtilityPaymentDialog
          open={createUtilityDialogOpen}
          onOpenChange={setCreateUtilityDialogOpen}
          propertyId={propertyId}
          tenantId={currentTenant.tenant_id}
          managerId={managerId}
        />
      )}
    </div>
  );
}
