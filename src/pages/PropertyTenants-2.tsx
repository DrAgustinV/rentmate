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

import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Archive } from "lucide-react";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";
import { ContractsTab } from "@/components/property-tenants/ContractsTab";
import { PaymentsTab } from "@/components/property-tenants/PaymentsTab";
import { TicketsTab } from "@/components/property-tenants/TicketsTab";
import { HistoricTab } from "@/components/property-tenants/HistoricTab";
import { CreateTenancyWizard } from "@/components/CreateTenancyWizard";
import { EndTenancyDialog } from "@/components/EndTenancyDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { TenantSwitcher } from "@/components/property-hub/TenantSwitcher";
import { PropertySwitcher } from "@/components/property-hub/PropertySwitcher";
import { showToast } from "@/lib/toast";
import { usePropertyTenantsData, Tenant, Invitation } from "@/hooks/usePropertyTenants";

interface WizardFormData {
  id?: string;
  rent_amount_cents?: number;
  currency?: string;
  security_deposit_cents?: number;
  payment_day?: number;
  start_date?: string;
  end_date?: string;
  utilities_config?: Record<string, unknown>;
  self_manage_only?: boolean;
  tenant_email?: string;
  contract_method?: string;
  selected_template_id?: string;
  require_email_verification?: boolean;
  require_kyc_verification?: boolean;
  require_phone_verification?: boolean;
  manager_tenant_name?: string;
  manager_tenant_surname?: string;
  manager_tenant_phone?: string;
}

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalyticsContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const { tenancyId } = location.state || {};
  const activeTab = searchParams.get("tab") || "contracts";
  const actionParam = searchParams.get("action");
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [hasTriggeredAction, setHasTriggeredAction] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [showEndTenancyDialog, setShowEndTenancyDialog] = useState(false);
  const [endingTenant, setEndingTenant] = useState<Tenant | null>(null);
  const [showEndNowWarning, setShowEndNowWarning] = useState(false);
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  const [finalizingTenant, setFinalizingTenant] = useState<Tenant | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [dismissingInvitation, setDismissingInvitation] = useState<Invitation | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [wizardInitialData, setWizardInitialData] = useState<WizardFormData | null>(null);
  const [wizardMode, setWizardMode] = useState<"new" | "edit" | "invite" | "next_tenancy">("new");
  const [cancelSetupOpen, setCancelSetupOpen] = useState(false);
  const [dateConflictOpen, setDateConflictOpen] = useState(false);

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
  const selectableTenants = allTenants?.filter((t) => t.tenancy_status !== "historic") || [];
  const currentTenant =
    focusedTenant || selectedTenant || (selectableTenants.length > 0 ? selectableTenants[0] : null);
  const isReadOnly = currentTenant?.tenancy_status === "historic";

  useEffect(() => {
    if (allTenants && allTenants.length > 0 && !selectedTenantId) {
      const firstNonHistoric = allTenants.find((t) => t.tenancy_status !== "historic");
      if (firstNonHistoric?.id) setSelectedTenantId(firstNonHistoric.id);
    }
  }, [allTenants, selectedTenantId]);

  // When a historic tenant is selected, force to historic tab
  useEffect(() => {
    if (currentTenant?.tenancy_status === "historic" && activeTab !== "historic") {
      setSearchParams({ tab: "historic" });
    }
  }, [currentTenant?.id, currentTenant?.tenancy_status, activeTab, setSearchParams]);

  const safeCurrentTenant = currentTenant
    ? {
        ...currentTenant,
        id: currentTenant.id || "",
        email: currentTenant.email || "Pending",
        first_name: currentTenant.first_name ?? null,
        last_name: currentTenant.last_name ?? null,
      }
    : null;

  const pendingRequirement =
    requirements?.find((r) => r.status === "draft" || r.status === "sent") || null;
  const canSetupNewTenancy =
    (!currentTenant ||
      currentTenant?.tenancy_status === "ending_tenancy" ||
      currentTenant?.tenancy_status === "historic" ||
      currentTenant?.tenancy_status === "pending") &&
    !pendingRequirement;
  const hasEndingTenancy = currentTenant?.tenancy_status === "ending_tenancy";

  useEffect(() => {
    if (actionParam === "newTenancy" && canSetupNewTenancy && !hasTriggeredAction && !propertyLoading) {
      setShowTenancyWizard(true);
      setHasTriggeredAction(true);
      setSearchParams({ tab: "contracts" });
    }
  }, [actionParam, canSetupNewTenancy, hasTriggeredAction, propertyLoading, setSearchParams]);

  useEffect(() => {
    const guideHighlight = searchParams.get("guideHighlight");
    if (guideHighlight) {
      if (guideHighlight === "contracts") setSearchParams({ tab: "contracts" });
      else if (guideHighlight === "payments") setSearchParams({ tab: "payments" });
      else if (guideHighlight === "rent") setSearchParams({ tab: "contracts" });
      searchParams.delete("guideHighlight");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleWizardSubmit = async (
    data: WizardFormData,
    mode: "new" | "edit" | "invite" | "next_tenancy"
  ) => {
    try {
      if (mode === "invite") {
        if (!data.tenant_email) {
          showToast.error(t("tenancy.wizard.requiredEmail") || "Tenant email is required");
          return;
        }
        await inviteMutation.mutateAsync(data.tenant_email);
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        showToast.success(t("tenancy.invitationSent") || "Invitation sent to tenant");
        setShowTenancyWizard(false);
        setWizardInitialData(null);
        setWizardMode("new");
        return;
      }

      if (
        mode === "edit" &&
        (currentTenant?.tenancy_status === "ending_tenancy" ||
          currentTenant?.tenancy_status === "pending")
      ) {
        showToast.error(
          t("tenancy.cannotEditActiveTenancy") ||
            "Cannot edit rental terms for this tenancy. Please set up a new tenancy instead."
        );
        return;
      }

      if (wizardInitialData?.id && mode === "edit") {
        const { error: updateError } = await supabase
          .from("tenancy_requirements")
          .update({
            rent_amount_cents: data.rent_amount_cents,
            currency: data.currency,
            security_deposit_cents: data.security_deposit_cents,
            payment_day: data.payment_day,
            start_date: data.start_date,
            end_date: data.end_date,
            utilities_config: data.utilities_config as Record<string, unknown>,
          })
          .eq("id", wizardInitialData.id);
        if (updateError) throw updateError;

        if (currentTenant?.id) {
          const { error: propertyError } = await supabase
            .from("property_tenants")
            .update({
              manager_tenant_name: data.manager_tenant_name || null,
              manager_tenant_surname: data.manager_tenant_surname || null,
              manager_tenant_phone: data.manager_tenant_phone || null,
            })
            .eq("id", currentTenant.id);
          if (propertyError) throw propertyError;
        }

        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        showToast.success(t("tenancy.wizard.setupSaved") || "Rental terms updated successfully.");
        setShowTenancyWizard(false);
        setWizardInitialData(null);
        return;
      }

      const requirement = await createRequirement.mutateAsync(data);
      const startDateStr = data.start_date || new Date().toISOString().split("T")[0];
      const tenancyId = crypto.randomUUID();

      if (data.self_manage_only && !data.tenant_email) {
        const { error: tenancyError } = await supabase.from("property_tenants").insert({
          id: tenancyId,
          property_id: propertyId,
          tenancy_status: "active",
          started_at: startDateStr,
          notes: "Self-managed tenancy (no tenant)",
          manager_tenant_name: data.manager_tenant_name || null,
          manager_tenant_surname: data.manager_tenant_surname || null,
          manager_tenant_phone: data.manager_tenant_phone || null,
        });
        if (tenancyError) throw tenancyError;
        if (requirement?.id) {
          const { error: reqError } = await supabase
            .from("tenancy_requirements")
            .update({ status: "completed", tenancy_id: tenancyId })
            .eq("id", requirement.id);
          if (reqError) throw reqError;
        }
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success(
          t("tenancy.wizard.setupSaved") ||
            "Tenancy setup saved. You can now manage contracts, tickets, and payments."
        );
      } else if (data.self_manage_only && data.tenant_email) {
        const { error: tenancyError } = await supabase.from("property_tenants").insert({
          id: tenancyId,
          property_id: propertyId,
          tenancy_status: "active",
          started_at: startDateStr,
          notes: `Self-managed tenancy with invited tenant (${data.tenant_email})`,
          manager_tenant_name: data.manager_tenant_name || null,
          manager_tenant_surname: data.manager_tenant_surname || null,
          manager_tenant_phone: data.manager_tenant_phone || null,
        });
        if (tenancyError) throw tenancyError;
        if (requirement?.id) {
          const { error: reqError } = await supabase
            .from("tenancy_requirements")
            .update({ status: "completed", tenancy_id: tenancyId })
            .eq("id", requirement.id);
          if (reqError) throw reqError;
        }
        await inviteMutation.mutateAsync(data.tenant_email);
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success(
          t("tenancy.selfManagedActive") || "Self-managed tenancy is active. Tenant has been invited."
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success(
          t("tenancy.wizard.setupSaved") || "Tenancy setup saved. Send invitation when ready."
        );
      }

      setShowTenancyWizard(false);
      setEditingInvitation(null);
      setWizardInitialData(null);
      setWizardMode("new");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : t("common.error");
      showToast.error(message);
    }
  };

  const handleSaveAndStartAnother = async (
    data: WizardFormData,
    mode: "new" | "edit" | "invite" | "next_tenancy"
  ) => {
    await handleWizardSubmit(data, mode);
    setShowTenancyWizard(true);
    setWizardMode("new");
    setWizardInitialData(null);
    setEditingInvitation(null);
  };

  const handleSendInvitation = async () => {
    const email = pendingRequirement?.tenant_email;
    if (!email) {
      showToast.error(t("tenancy.noEmailToInvite") || "No tenant email configured");
      return;
    }
    try {
      await inviteMutation.mutateAsync(email);
      showToast.success(t("tenancy.invitationSent") || "Invitation sent to tenant");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.error");
      showToast.error(message);
    }
  };

  const handleCancelSetup = () => {
    if (!pendingRequirement) return;
    setCancelSetupOpen(true);
  };

  const doCancelSetup = async () => {
    if (!pendingRequirement) return;
    setCancelSetupOpen(false);
    try {
      await deleteRequirement.mutateAsync(pendingRequirement.id);
      await Promise.all([
        supabase
          .from("invitations")
          .update({ status: "cancelled" })
          .eq("property_id", propertyId)
          .eq("status", "pending"),
        supabase
          .from("property_tenants")
          .delete()
          .eq("property_id", propertyId)
          .is("tenant_id", null)
          .eq("tenancy_status", "active"),
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] }),
        queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.error");
      showToast.error(message);
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
      showToast.success(t("tenancy.invitationResent") || "Invitation resent to tenant");
      refetchInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.error");
      showToast.error(message);
    }
  };

  const handleEditAndResend = async (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setWizardMode("edit");
    setShowTenancyWizard(true);
    setWizardInitialData({
      id: invitation.tenancy_requirements_id || undefined,
      rent_amount_cents: 0,
      currency: "USD",
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      utilities_config: {},
      self_manage_only: false,
      tenant_email: invitation.email,
    });
  };

  const handleWizardSubmitWithResend = async (data: WizardFormData) => {
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
      await handleWizardSubmit(data, "edit");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.error");
      showToast.error(message);
    }
  };

  const handleEditRentalTerms = async () => {
    if (!currentTenant) return;
    const isSelfManaged = !currentTenant.tenant_id;
    const tenantName = currentTenant.manager_tenant_name || currentTenant.first_name || "";
    const tenantSurname = currentTenant.manager_tenant_surname || currentTenant.last_name || "";
    let initialData: WizardFormData = {
      id: undefined,
      rent_amount_cents: 0,
      currency: "USD",
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: currentTenant.started_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      end_date: currentTenant.ended_at?.split("T")[0] || "",
      utilities_config: {},
      self_manage_only: isSelfManaged,
      tenant_email: currentTenant.email,
      manager_tenant_name: tenantName,
      manager_tenant_surname: tenantSurname,
    };

    const { data: existingReq } = await supabase
      .from("tenancy_requirements")
      .select("*")
      .eq("property_id", propertyId)
      .eq("tenancy_id", currentTenant.id)
      .maybeSingle();

    if (existingReq) {
      initialData = {
        id: existingReq.id,
        rent_amount_cents: existingReq.rent_amount_cents || 0,
        currency: existingReq.currency || "USD",
        security_deposit_cents: existingReq.security_deposit_cents || 0,
        payment_day: existingReq.payment_day || 1,
        start_date: existingReq.start_date?.split("T")[0] || initialData.start_date,
        end_date: existingReq.end_date?.split("T")[0] || "",
        utilities_config: existingReq.utilities_config || {},
        self_manage_only: isSelfManaged,
        tenant_email: currentTenant.email,
        contract_method: existingReq.contract_method,
        selected_template_id: existingReq.selected_template_id,
        require_email_verification: existingReq.require_email_verification,
        require_kyc_verification: existingReq.require_kyc_verification,
        require_phone_verification: existingReq.require_phone_verification,
        manager_tenant_name: tenantName,
        manager_tenant_surname: tenantSurname,
      };
    }

    setWizardMode("edit");
    setWizardInitialData(initialData);
    setShowTenancyWizard(true);
  };

  const handleInviteInSelfManaged = () => {
    if (!currentTenant) return;
    setWizardMode("invite");
    setWizardInitialData({
      id: currentTenant.id,
      rent_amount_cents: 0,
      currency: "USD",
      security_deposit_cents: 0,
      payment_day: 1,
      start_date:
        currentTenant.started_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      end_date: currentTenant.ended_at?.split("T")[0] || "",
      utilities_config: {},
      self_manage_only: true,
      tenant_email: currentTenant.email,
      manager_tenant_name: currentTenant.manager_tenant_name || currentTenant.first_name || "",
      manager_tenant_surname:
        currentTenant.manager_tenant_surname || currentTenant.last_name || "",
    });
    setShowTenancyWizard(true);
  };

  const handleBulkDismissDeclined = async (invitations: Invitation[]) => {
    const results = await Promise.allSettled(
      invitations.map((inv) => dismissInvitationMutation.mutateAsync(inv.id))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    if (succeeded > 0) {
      showToast.success(
        failed > 0
          ? `${succeeded} dismissed, ${failed} failed`
          : t("tenancy.declinedDismissed") || "Declined invitations dismissed"
      );
    }
    if (failed > 0) showToast.error(`${failed} invitation(s) failed to dismiss`);
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.tenancy_status === "pending") return tenant.email;
    return `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() || tenant.email;
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
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <PropertySwitcher currentPropertyId={propertyId!} />
        </div>

        {/* Tenant Switcher for Multiple Tenants */}
        {userRole?.isManager && allTenants && allTenants.length > 0 && currentTenant && (
          <TenantSwitcher
            tenants={allTenants}
            selectedTenantId={currentTenant.id}
            onSelectTenant={setSelectedTenantId}
            onViewHistoric={() => setActiveTab("historic")}
          />
        )}

        {/* Read-only banner for historic tenancy */}
        {isReadOnly && (
          <div className="flex items-center gap-3 rounded-lg border border-muted bg-muted/40 px-4 py-3">
            <Archive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              {t("tenancy.viewingArchivedTenancy") ||
                "You are viewing an archived tenancy. All data is read-only."}
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isReadOnly ? "grid-cols-1" : "grid-cols-4"}`}>
            {!isReadOnly && (
              <>
                <TabsTrigger value="contracts">{t("propertyTenants.tabs.contracts")}</TabsTrigger>
                <TabsTrigger value="payments">{t("propertyTenants.tabs.payments")}</TabsTrigger>
                <TabsTrigger value="tickets">{t("propertyTenants.tabs.tickets")}</TabsTrigger>
              </>
            )}
            <TabsTrigger value="historic">{t("propertyTenants.tabs.historic")}</TabsTrigger>
          </TabsList>

          {!isReadOnly && (
            <>
            <TabsContent value="contracts" className="mt-6">
              <ContractsTab
                tenant={{
                  currentTenant: safeCurrentTenant,
                  propertyId: propertyId!,
                  userRole: userRole,
                  isReadOnly: false,
                }}
                setupState={{
                  pendingRequirement,
                  canSetupNewTenancy,
                  hasEndingTenancy,
                  isDeleting: deleteRequirement.isPending,
                  isResending: inviteMutation.isPending,
                  isDismissing: dismissInvitationMutation.isPending,
                }}
                callbacks={{
                  onStartSetup: () => {
                    if (
                      currentTenant &&
                      (currentTenant.tenancy_status === "active" ||
                        currentTenant.tenancy_status === "ending_tenancy")
                    ) {
                      setDateConflictOpen(true);
                    } else {
                      setWizardMode("new");
                      setShowTenancyWizard(true);
                    }
                  },
                  onSendInvitation: handleSendInvitation,
                  onCancelSetup: handleCancelSetup,
                  onResendInvitation: handleResendInvitation,
                  onEditTenant: setEditingTenant,
                  onEndTenancy: (tenant) => {
                    setEndingTenant(tenant);
                    setShowEndTenancyDialog(true);
                  },
                  onFinalizeTenancy: (tenant) => setFinalizingTenant(tenant),
                  setCancellingInvitation,
                  onEditAndResend: handleEditAndResend,
                  onDismissInvitation: setDismissingInvitation,
                  onBulkDismissDeclined: handleBulkDismissDeclined,
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
                <TicketsTab
                  propertyId={propertyId!}
                  tenancyId={safeCurrentTenant?.id}
                  isManager={userRole?.isManager ?? false}
                />
              </TabsContent>
            </>
          )}

          <TabsContent value="historic" className="mt-6">
            <HistoricTab propertyId={propertyId!} isManager={userRole?.isManager ?? false} />
          </TabsContent>
        </Tabs>
      </div>

      {/* End Tenancy Dialog */}
      <EndTenancyDialog
        open={showEndTenancyDialog}
        onOpenChange={(open) => {
          setShowEndTenancyDialog(open);
          if (!open) setEndingTenant(null);
        }}
        tenantName={endingTenant ? getTenantName(endingTenant) : ""}
        canEndImmediately={!!endingTenant}
        onConfirm={async (plannedEndDate, mode) => {
          if (endingTenant) {
            if (mode === "finalize") {
              setShowEndTenancyDialog(false);
              setShowEndNowWarning(true);
            } else {
              await endTenancyMutation.mutateAsync({ tenantId: endingTenant.id, plannedEndDate });
              setShowEndTenancyDialog(false);
              setEndingTenant(null);
            }
          }
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
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <p>{t("dialogs.manageTenants.finalizeConsequences") || "This will:"}</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t("dialogs.manageTenants.finalizeConsequence1") || "Mark the tenancy as historic (read-only)"}</li>
                <li>{t("dialogs.manageTenants.finalizeConsequence2") || "Allow setting up a new tenancy in parallel"}</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (finalizingTenant) {
                  finalizeTenancyMutation.mutate(finalizingTenant.id);
                  setFinalizingTenant(null);
                }
              }}
            >
              {t("dialogs.manageTenants.finalize")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Now Warning Dialog */}
      <AlertDialog
        open={showEndNowWarning}
        onOpenChange={(open) => {
          setShowEndNowWarning(open);
          if (!open) setEndingTenant(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.endTenancy.nowWarningTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialogs.endTenancy.nowWarningDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (endingTenant) {
                  await finalizeTenancyMutation.mutateAsync(endingTenant.id);
                  setShowEndNowWarning(false);
                  setEndingTenant(null);
                }
              }}
            >
              {t("dialogs.endTenancy.endImmediately")}
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
              onClick={() =>
                cancellingInvitation && cancelInvitationMutation.mutate(cancellingInvitation.id)
              }
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
            setWizardMode("new");
          }
        }}
        propertyId={propertyId!}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={editingInvitation ? handleWizardSubmitWithResend : handleWizardSubmit}
        onSaveAndStartAnother={handleSaveAndStartAnother}
        isSubmitting={createRequirement.isPending}
        initialData={wizardInitialData}
        mode={wizardMode}
        invitationExpiryNotice={!!editingInvitation}
      />

      {/* Cancel Setup Confirmation Dialog */}
      <AlertDialog open={cancelSetupOpen} onOpenChange={setCancelSetupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tenancy.deleteDraftSetupTitle") || "Delete Draft Setup?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tenancy.deleteDraftSetupDesc") ||
                "This will permanently delete the draft tenancy requirements, cancel pending invitations, and remove any self-managed tenancy. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doCancelSetup}>
              {t("tenancy.deleteDraftSetup") || "Delete Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Date Conflict Warning Dialog */}
      <AlertDialog open={dateConflictOpen} onOpenChange={setDateConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tenancy.dateConflictTitle") || "Date Conflict Detected"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tenancy.dateConflictDesc") ||
                "This property already has an active or ending tenancy. Starting a new one may overlap. Do you want to proceed?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDateConflictOpen(false)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDateConflictOpen(false);
                setWizardMode("next_tenancy");
                setShowTenancyWizard(true);
              }}
            >
              {t("common.continue") || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss Invitation Dialog */}
      <AlertDialog open={!!dismissingInvitation} onOpenChange={() => setDismissingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invitations.dismissDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("invitations.dismissDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dismissingInvitation && dismissInvitationMutation.mutate(dismissingInvitation.id)
              }
            >
              {t("invitations.dismissDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
