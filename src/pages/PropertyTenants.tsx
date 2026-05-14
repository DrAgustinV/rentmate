import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertTriangle,
  History,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { ContractsTab } from '@/components/property-tenants/ContractsTab';
import { PaymentsTab } from '@/components/property-tenants/PaymentsTab';
import { TicketsTab } from '@/components/property-tenants/TicketsTab';
import { HistoricTab } from '@/components/property-tenants/HistoricTab';
import { CreateTenancyWizard } from '@/components/CreateTenancyWizard';
import { EndTenancyDialog } from "@/components/EndTenancyDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { TenantSwitcher } from "@/components/property-hub/TenantSwitcher";
import { PropertySwitcher } from "@/components/property-hub/PropertySwitcher";
import { showToast } from "@/lib/toast";
import { usePropertyTenantsData, Tenant, Invitation } from '@/hooks/usePropertyTenants';

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalyticsContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const { tenancyId, tenancyStatus } = location.state || {};
  const isReadOnly = tenancyStatus === 'historic';
  const activeTab = searchParams.get('tab') || 'contracts';
  const actionParam = searchParams.get('action');
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [hasTriggeredAction, setHasTriggeredAction] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [showEndTenancyDialog, setShowEndTenancyDialog] = useState(false);
  const [endingTenant, setEndingTenant] = useState<Tenant | null>(null);
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  const [finalizingTenant, setFinalizingTenant] = useState<Tenant | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [dismissingInvitation, setDismissingInvitation] = useState<Invitation | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null);
  const [wizardMode, setWizardMode] = useState<'new' | 'edit' | 'invite' | 'next_tenancy'>('new');

  const {
    property, propertyLoading,
    userRole,
    allTenants,
    invitations, refetchInvitations,
    templates,
    createRequirement, requirements, deleteRequirement,
    inviteMutation,
    dismissInvitationMutation,
    endTenancyMutation,
    finalizeTenancyMutation,
    cancelInvitationMutation,
  } = usePropertyTenantsData(propertyId, t);

  const focusedTenant = allTenants?.find((t) => t.id === tenancyId);
  const selectedTenant = allTenants?.find((t) => t.id === selectedTenantId);
  const selectableTenants = allTenants?.filter(t => t.tenancy_status !== 'historic') || [];
  const currentTenant = focusedTenant || selectedTenant || (selectableTenants.length > 0 ? selectableTenants[0] : null);
  const isHistoricView = currentTenant?.tenancy_status === 'historic';

  useEffect(() => {
    if (allTenants && allTenants.length > 0 && !selectedTenantId) {
      const firstNonHistoric = allTenants.find(t => t.tenancy_status !== 'historic');
      if (firstNonHistoric?.id) setSelectedTenantId(firstNonHistoric.id);
    }
  }, [allTenants, selectedTenantId]);

  const safeCurrentTenant = currentTenant ? {
    ...currentTenant,
    id: currentTenant.id || '',
    email: currentTenant.email || 'Pending',
    first_name: currentTenant.first_name ?? null,
    last_name: currentTenant.last_name ?? null,
  } : null;

  const pendingRequirement = requirements?.find(r => r.status === 'draft' || r.status === 'sent') || null;
  const canSetupNewTenancy = (!currentTenant || 
    currentTenant?.tenancy_status === 'ending_tenancy' || 
    currentTenant?.tenancy_status === 'pending') && !pendingRequirement;
  const hasEndingTenancy = currentTenant?.tenancy_status === 'ending_tenancy';

  useEffect(() => {
    if (actionParam === 'newTenancy' && canSetupNewTenancy && !hasTriggeredAction && !propertyLoading) {
      setShowTenancyWizard(true);
      setHasTriggeredAction(true);
      setSearchParams({ tab: 'contracts' });
    }
  }, [actionParam, canSetupNewTenancy, hasTriggeredAction, propertyLoading, setSearchParams]);

  const handleWizardSubmit = async (data: any, mode: 'new' | 'edit' | 'invite' | 'next_tenancy') => {
    try {
      // Block editing if tenancy is ending or pending
      if (mode === 'edit' && (currentTenant?.tenancy_status === 'ending_tenancy' || currentTenant?.tenancy_status === 'pending')) {
        showToast.error({ title: t('tenancy.cannotEditActiveTenancy') || 'Cannot edit rental terms for this tenancy. Please set up a new tenancy instead.' });
        return;
      }

      // Check if we're editing existing requirements (wizardInitialData has ID)
      if (wizardInitialData?.id && mode === 'edit') {
        const { error: updateError } = await supabase
          .from('tenancy_requirements')
          .update({
            rent_amount_cents: data.rent_amount_cents,
            currency: data.currency,
            security_deposit_cents: data.security_deposit_cents,
            payment_day: data.payment_day,
            start_date: data.start_date,
            end_date: data.end_date,
            utilities_config: data.utilities_config as any,
          })
          .eq('id', wizardInitialData.id);
        
        if (updateError) throw updateError;
        
        queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Rental terms updated successfully.' });
        setShowTenancyWizard(false);
        setWizardInitialData(null);
        return;
      }
      
      const requirement = await createRequirement.mutateAsync(data);
      
      // Case 1: Self-manage only + NO email → create active tenancy (self-management)
      if (data.self_manage_only && !data.tenant_email) {
        const { error: tenancyError } = await supabase
          .from('property_tenants')
          .insert({
            property_id: propertyId,
            tenancy_status: 'active',
            started_at: new Date().toISOString(),
            notes: 'Self-managed tenancy (no tenant)',
          });
        
        if (tenancyError) {
          console.error('Error creating self-managed tenancy:', tenancyError);
        }
        
        queryClient.invalidateQueries({ queryKey: ['all-tenants-basic', propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. You can now manage contracts, tickets, and payments.' });
      } 
      // Case 2: Self-manage only + email provided → create pending tenancy AND send invitation
      else if (data.self_manage_only && data.tenant_email) {
        // Create pending tenancy - omit tenant_id entirely to allow null
        const { error: tenancyError } = await supabase
          .from('property_tenants')
          .insert({
            property_id: propertyId,
            tenancy_status: 'pending',
            started_at: new Date().toISOString(),
            notes: `Pending invitation sent to ${data.tenant_email}`,
          });
        
        if (tenancyError) {
          console.error('Error creating pending tenancy:', tenancyError);
        }
        
        queryClient.invalidateQueries({ queryKey: ['all-tenants-basic', propertyId] });
        queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
        showToast.success({ title: t('tenancy.invitationSent') || 'Invitation sent. You can now manage contracts, tickets, and payments while waiting for tenant.' });
      }
      // Case 3: Not self-manage → standard flow (create requirement, send invitation later)
      else {
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. Send invitation when ready.' });
      }
      
      setShowTenancyWizard(false);
      setEditingInvitation(null);
      setWizardInitialData(null);
      setWizardMode('new');
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleSendInvitation = async (email: string) => {
    try {
      await inviteMutation.mutateAsync(email);
      showToast.success({ title: t('tenancy.invitationSent') || 'Invitation sent to tenant' });
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleCancelSetup = async () => {
    if (!pendingRequirement) return;
    try {
      await deleteRequirement.mutateAsync(pendingRequirement.id);
      queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", invitationId);

      if (error) throw error;

      showToast.success({ title: t('tenancy.invitationResent') || 'Invitation resent to tenant' });
      refetchInvitations();
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleEditAndResend = async (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setWizardMode('edit');
    setShowTenancyWizard(true);
    setWizardInitialData({
      id: invitation.tenancy_requirements_id || undefined,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      utilities_config: {},
      self_manage_only: false,
      tenant_email: invitation.email,
    });
  };

  const handleWizardSubmitWithResend = async (data: CreateTenancyRequirementInput) => {
    if (!editingInvitation) return;
    try {
      const { error } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", editingInvitation.id);

      if (error) throw error;

      await handleWizardSubmit(data, 'edit');
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleEditRentalTerms = (tenant: Tenant) => {
    setWizardMode('edit');
    setWizardInitialData({
      id: tenant.id,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: tenant.started_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      end_date: tenant.ended_at?.split('T')[0] || '',
      utilities_config: {},
      self_manage_only: false,
      tenant_email: tenant.email,
    });
    setShowTenancyWizard(true);
  };

  const handleInviteInSelfManaged = (tenant: Tenant) => {
    setWizardMode('invite');
    setWizardInitialData({
      id: tenant.id,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: tenant.started_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      end_date: tenant.ended_at?.split('T')[0] || '',
      utilities_config: {},
      self_manage_only: true,
      tenant_email: tenant.email,
    });
    setShowTenancyWizard(true);
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.tenancy_status === 'pending') return tenant.email;
    return `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenant.email;
  };

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-48" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          
          <PropertySwitcher currentPropertyId={propertyId!} />
        </div>

        {/* Historic Tenancy Read-Only Banner */}
        {isHistoricView && (
          <Alert variant="default" className="border-muted-foreground/30 bg-muted/30">
            <History className="h-4 w-4" />
            <AlertTitle className="text-muted-foreground">{t("tenancy.viewingHistoric")}</AlertTitle>
          </Alert>
        )}

        {/* Tenant Switcher for Multiple Tenants */}
        {userRole?.isManager && allTenants && allTenants.length > 0 && currentTenant && (
          <TenantSwitcher
            tenants={allTenants}
            selectedTenantId={currentTenant.id}
            onSelectTenant={setSelectedTenantId}
            onViewHistoric={() => setActiveTab('historic')}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contracts">{t("propertyTenants.tabs.contracts")}</TabsTrigger>
            <TabsTrigger value="payments">{t("propertyTenants.tabs.payments")}</TabsTrigger>
            <TabsTrigger value="tickets">{t("propertyTenants.tabs.tickets")}</TabsTrigger>
            <TabsTrigger value="historic">{t("propertyTenants.tabs.historic")}</TabsTrigger>
          </TabsList>

              <TabsContent value="contracts" className="mt-6">
                <ContractsTab
                  tenant={{ currentTenant: safeCurrentTenant, propertyId: propertyId!, userRole, isReadOnly }}
                  setupState={{ pendingRequirement, canSetupNewTenancy, hasEndingTenancy, isDeleting: deleteRequirement.isPending, isResending: inviteMutation.isPending, isDismissing: dismissInvitationMutation.isPending }}
                  callbacks={{
                    onStartSetup: () => { setWizardMode('new'); setShowTenancyWizard(true); },
                    onSendInvitation: handleSendInvitation,
                    onCancelSetup: handleCancelSetup,
                    onResendInvitation: handleResendInvitation,
                    onEditTenant: setEditingTenant,
                    onEndTenancy: (tenant) => { setEndingTenant(tenant); setShowEndTenancyDialog(true); },
                    onFinalizeTenancy: (tenant) => setFinalizingTenant(tenant),
                    setCancellingInvitation,
                    onEditAndResend: handleEditAndResend,
                    onDismissInvitation: setDismissingInvitation,
                    onEditRentalTerms: handleEditRentalTerms,
                    onInviteInSelfManaged: handleInviteInSelfManaged,
                  }}
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentsTab
                  currentTenant={safeCurrentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="tickets" className="mt-6">
                <TicketsTab propertyId={propertyId!} tenancyId={safeCurrentTenant?.id} isManager={userRole?.isManager} />
              </TabsContent>

              <TabsContent value="historic" className="mt-6">
                <HistoricTab propertyId={propertyId!} isManager={userRole?.isManager || false} />
              </TabsContent>

        </Tabs>
      </div>

      {/* End Tenancy Dialog with Date Picker */}
      <EndTenancyDialog
        open={showEndTenancyDialog}
        onOpenChange={(open) => {
          setShowEndTenancyDialog(open);
          if (!open) setEndingTenant(null);
        }}
        tenantName={endingTenant ? getTenantName(endingTenant) : ""}
        canEndImmediately={!!endingTenant && (!endingTenant.tenant_id || endingTenant.tenancy_status === 'pending')}
        onConfirm={async (plannedEndDate, mode) => {
          if (endingTenant) {
            if (mode === 'finalize') {
              await finalizeTenancyMutation.mutateAsync(endingTenant.id);
            } else {
              await endTenancyMutation.mutateAsync({ tenantId: endingTenant.id, plannedEndDate });
            }
          }
          setShowEndTenancyDialog(false);
          setEndingTenant(null);
        }}
        isPending={endTenancyMutation.isPending || finalizeTenancyMutation.isPending}
      />

      {/* Finalize Tenancy Dialog */}
      <AlertDialog open={!!finalizingTenant} onOpenChange={() => setFinalizingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.finalizeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t("dialogs.manageTenants.finalizeMessage")} ${finalizingTenant && getTenantName(finalizingTenant)}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (finalizingTenant) {
                  finalizeTenancyMutation.mutate(finalizingTenant.id);
                }
              }}
            >
              {t("dialogs.manageTenants.finalize")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={() => setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.cancelInvitationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingInvitation &&
                `${t("dialogs.manageTenants.cancelInvitationDesc")} ${cancellingInvitation.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingInvitation && cancelInvitationMutation.mutate(cancellingInvitation.id)}
            >
              {t("dialogs.manageTenants.cancelInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tenant Dialog */}
      <EditTenantDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        propertyId={propertyId!}
        readOnly={isReadOnly}
      />

      {/* Tenancy Setup Wizard */}
      <CreateTenancyWizard
        open={showTenancyWizard}
        onOpenChange={(open) => {
          setShowTenancyWizard(open);
          if (!open) {
            setEditingInvitation(null);
            setWizardInitialData(null);
            setWizardMode('new');
          }
        }}
        propertyId={propertyId!}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={editingInvitation ? handleWizardSubmitWithResend : handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
        initialData={wizardInitialData}
        mode={wizardMode}
      />

      {/* Dismiss Invitation Dialog */}
      <AlertDialog open={!!dismissingInvitation} onOpenChange={() => setDismissingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invitations.dismissDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("invitations.dismissDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dismissingInvitation && dismissInvitationMutation.mutate(dismissingInvitation)}
            >
              {t("invitations.dismissDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
