import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Building, Users, Plus } from "lucide-react";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { CreateTenancyWizard } from "@/components/CreateTenancyWizard";
import type { CreateTenancyRequirementInput } from "@/hooks/useTenancyRequirements";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import { OverviewTab } from "@/components/property-hub/OverviewTab";
import { PaymentsTab } from "@/components/property-tenants/PaymentsTab";
import { CostsTab } from "@/components/property-tenants/CostsTab";
import { TicketsTab } from "@/components/property-tenants/TicketsTab";
import { FinancialAnalysisTab } from "@/components/property-hub/FinancialAnalysisTab";
import { usePropertyTenantsData } from "@/hooks/usePropertyTenants";
import { TenantStatusPills } from "@/components/property-hub/TenantStatusPills";
import { filterTenantsByPill, type TenantFilter } from "@/lib/tenantFilterUtils";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { StatusBadge } from "@/components/property-tenants/StatusBadge";
import { getTenancyDisplayLabel } from "@/lib/tenancyStatus";
import { formatDate } from "@/lib/dateUtils";

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
  manager_tenant_name?: string;
  manager_tenant_surname?: string;
  manager_tenant_phone?: string;
}

export default function PropertyHub() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  const [tenantFilter, setTenantFilter] = useState<TenantFilter>("current");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<typeof selectedTenant>(null);

  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<WizardFormData | null>(null);
  const [wizardMode, setWizardMode] = useState<"new" | "edit" | "invite" | "next_tenancy">("new");
  const [cancelSetupOpen, setCancelSetupOpen] = useState(false);
  const [submissionInProgress, setSubmissionInProgress] = useState(false);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
    setSelectedTenantId(null);
  };

  const {
    property, propertyLoading,
    userRole,
    activeTenantWithProfile,
    allTenants,
    invitations, refetchInvitations,
    templates,
    createRequirement, requirements, deleteRequirement,
    inviteMutation,
  } = usePropertyTenantsData(propertyId, t);

  const { data: rentAgreements } = useRentAgreements(propertyId);

  const actionParam = searchParams.get("action");
  const activeTenant = useMemo(
    () => allTenants?.find(t => t.tenancy_status === "active" || t.tenancy_status === "ending_tenancy") || null,
    [allTenants],
  );
  const canSetupNewTenancy = userRole?.isManager && (
    !activeTenant ||
    activeTenant.tenancy_status === "ending_tenancy"
  );

  const pendingRequirement = requirements?.find(
    (r) => r.status === "draft" || r.status === "sent",
  ) || null;

  const filteredTenants = useMemo(
    () => filterTenantsByPill(allTenants || [], tenantFilter),
    [allTenants, tenantFilter],
  );

  const selectedTenant = useMemo(
    () => allTenants?.find((t) => t.id === selectedTenantId) || null,
    [allTenants, selectedTenantId],
  );

  const handleWizardSubmit = async (
    data: CreateTenancyRequirementInput,
    mode: "new" | "edit" | "invite" | "next_tenancy",
  ) => {
    setSubmissionInProgress(true);
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

        if (activeTenant?.id) {
          const { error: propertyError } = await supabase
            .from("property_tenants")
            .update({
              manager_tenant_name: data.manager_tenant_name || null,
              manager_tenant_surname: data.manager_tenant_surname || null,
              manager_tenant_phone: data.manager_tenant_phone || null,
            })
            .eq("id", activeTenant.id);
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
      const newTenancyId = crypto.randomUUID();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const managerId = currentUser?.id;
      let tenancyCreated = false;
      let requirementUpdated = false;

      if (data.self_manage_only && !data.tenant_email) {
        const { error: tenancyError } = await supabase.from("property_tenants").insert({
          id: newTenancyId,
          property_id: propertyId,
          tenancy_status: "active",
          started_at: startDateStr,
          notes: "Self-managed tenancy (no tenant)",
          manager_tenant_name: data.manager_tenant_name || null,
          manager_tenant_surname: data.manager_tenant_surname || null,
          manager_tenant_phone: data.manager_tenant_phone || null,
        });
        if (tenancyError) throw tenancyError;
        tenancyCreated = true;
        if (requirement?.id) {
          const { error: reqError } = await supabase
            .from("tenancy_requirements")
            .update({ status: "completed", tenancy_id: newTenancyId })
            .eq("id", requirement.id);
          if (reqError) throw reqError;
          requirementUpdated = true;
        }
        if (managerId && data.rent_amount_cents && data.payment_day) {
          const { error: agreementError } = await supabase.from("rent_agreements").insert({
            property_id: propertyId,
            tenancy_id: newTenancyId,
            tenant_id: managerId,
            manager_id: managerId,
            rent_amount_cents: data.rent_amount_cents,
            payment_day: data.payment_day,
            currency: (data.currency || "EUR").toLowerCase(),
            start_date: startDateStr,
            end_date: data.end_date || null,
            is_active: true,
          });
          if (agreementError) throw agreementError;
        }
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["rent-agreements", propertyId] });
        showToast.success(t("tenancy.wizard.setupSaved") || "Tenancy setup saved.");
      } else if (data.self_manage_only && data.tenant_email) {
        const { error: tenancyError } = await supabase.from("property_tenants").insert({
          id: newTenancyId,
          property_id: propertyId,
          tenancy_status: "active",
          started_at: startDateStr,
          notes: `Self-managed tenancy with invited tenant (${data.tenant_email})`,
          manager_tenant_name: data.manager_tenant_name || null,
          manager_tenant_surname: data.manager_tenant_surname || null,
          manager_tenant_phone: data.manager_tenant_phone || null,
        });
        if (tenancyError) throw tenancyError;
        tenancyCreated = true;
        if (requirement?.id) {
          const { error: reqError } = await supabase
            .from("tenancy_requirements")
            .update({ status: "completed", tenancy_id: newTenancyId })
            .eq("id", requirement.id);
          if (reqError) throw reqError;
          requirementUpdated = true;
        }
        if (managerId && data.rent_amount_cents && data.payment_day) {
          const { error: agreementError } = await supabase.from("rent_agreements").insert({
            property_id: propertyId,
            tenancy_id: newTenancyId,
            tenant_id: managerId,
            manager_id: managerId,
            rent_amount_cents: data.rent_amount_cents,
            payment_day: data.payment_day,
            currency: (data.currency || "EUR").toLowerCase(),
            start_date: startDateStr,
            end_date: data.end_date || null,
            is_active: true,
          });
          if (agreementError) throw agreementError;
        }
        await inviteMutation.mutateAsync(data.tenant_email);
        queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        queryClient.invalidateQueries({ queryKey: ["rent-agreements", propertyId] });
        showToast.success(
          t("tenancy.selfManagedActive") || "Self-managed tenancy is active. Tenant has been invited.",
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success(t("tenancy.wizard.setupSaved") || "Tenancy setup saved. Send invitation when ready.");
      }

      setShowTenancyWizard(false);
      setWizardInitialData(null);
      setWizardMode("new");
    } catch (error: unknown) {
      // Best-effort rollback of partial writes
      try {
        if (tenancyCreated && newTenancyId) {
          await supabase.from("rent_agreements").delete().eq("tenancy_id", newTenancyId).maybeSingle();
          await supabase.from("property_tenants").delete().eq("id", newTenancyId).maybeSingle();
        }
        if (requirementUpdated && requirement?.id) {
          await supabase
            .from("tenancy_requirements")
            .update({ status: "draft", tenancy_id: null })
            .eq("id", requirement.id);
        }
      } catch { /* rollback errors are intentionally swallowed — primary error takes precedence */ }

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message: unknown }).message)
            : t("common.error");
      showToast.error(message);
      throw error;
    } finally {
      setSubmissionInProgress(false);
    }
  };

  const handleSaveAndStartAnother = async (
    data: CreateTenancyRequirementInput,
    mode: "new" | "edit" | "invite" | "next_tenancy",
  ) => {
    await handleWizardSubmit(data, mode);
    setShowTenancyWizard(true);
    setWizardMode("new");
    setWizardInitialData(null);
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
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("common.error");
      showToast.error(message);
    }
  };

  // Auto-open wizard from action param
  useEffect(() => {
    if (actionParam === "newTenancy" && canSetupNewTenancy && !propertyLoading) {
      setShowTenancyWizard(true);
      const params = new URLSearchParams(searchParams);
      params.delete("action");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParam, canSetupNewTenancy, propertyLoading]);

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("properties.notFound")}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/properties")}>
            {t("common.backToList")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/properties")} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          {t("properties.backToList") || "Back to Properties"}
        </Button>
        <h1 className="text-3xl font-bold truncate">{property.title}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.info") || "Property Info"}
          </TabsTrigger>
          <TabsTrigger value="tenants" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.tenants") || "Tenants"}
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.payments") || "Payments"}
          </TabsTrigger>
          <TabsTrigger value="costs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.costs") || "Costs"}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.tickets") || "Tickets"}
          </TabsTrigger>
          <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.financial") || "Financial Analysis"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="pt-6">
          <OverviewTab
            property={property}
            propertyId={propertyId!}
            userRole={{ isManager: true, userId: undefined }}
            activeTenant={
              allTenants?.find(
                (t) => t.tenancy_status === "active" || t.tenancy_status === "ending_tenancy",
              ) || null
            }
            templates={templates || []}
            invitations={invitations || []}
            hasNoTenants={!allTenants || allTenants.length === 0}
          />
        </TabsContent>

        <TabsContent value="tenants" className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <TenantStatusPills value={tenantFilter} onChange={setTenantFilter} />
            {canSetupNewTenancy && (
              <Button onClick={() => { setShowTenancyWizard(true); setWizardMode("new"); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("tenancy.setupTenancy")}
              </Button>
            )}
          </div>

          {/* List View */}
          {!selectedTenantId && (
            <>
              {filteredTenants.length === 0 ? (
                <div className="border rounded-lg card-shine">
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50 text-primary" aria-hidden="true" />
                    <h3 className="text-lg font-semibold mb-2">{t("tenants.noTenants")}</h3>
                    <p className="text-muted-foreground">{t("tenants.noTenantsDesc")}</p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg card-shine">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {t("tenants.name") || "Name"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {t("tenants.email") || "Email"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {t("tenants.status") || "Status"}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {t("tenants.startDate") || "Start Date"}
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                          {t("rentAgreement.rentAmount") || "Rent"}
                        </th>
                        <th className="w-[80px] px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.length > 0 && filteredTenants.map((tenant) => (
                        <tr
                          key={tenant.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelectedTenantId(tenant.id)}
                        >
                          <td className="px-4 py-3 font-medium">
                            {tenant.first_name || tenant.manager_tenant_name || tenant.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {tenant.email || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={tenant.tenancy_status}
                              label={getTenancyDisplayLabel(
                                tenant.tenancy_status,
                                tenant.vacate_date ?? null,
                              )}
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {tenant.started_at
                              ? formatDate(tenant.started_at)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {(rentAgreements?.find(ra => ra.tenancy_id === tenant.id)?.rent_amount_cents ?? null) != null
                              ? "€" + ((rentAgreements!.find(ra => ra.tenancy_id === tenant.id)!.rent_amount_cents) / 100).toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTenant(tenant);
                                setEditDialogOpen(true);
                              }}
                            >
                              {t("common.edit") || "Edit"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Detail View */}
          {selectedTenantId && selectedTenant && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTenantId(null)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back") || "Back"}
              </Button>
              <div className="border rounded-lg card-shine p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedTenant.first_name || selectedTenant.manager_tenant_name || selectedTenant.email}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedTenant.email}</p>
                  </div>
                  <StatusBadge
                    status={selectedTenant.tenancy_status}
                    label={getTenancyDisplayLabel(
                      selectedTenant.tenancy_status,
                      selectedTenant.vacate_date ?? null,
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("tenants.startDate") || "Start Date"}:</span>{" "}
                    {selectedTenant.started_at
                      ? formatDate(selectedTenant.started_at)
                      : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("tenancy.plannedEnd") || "End Date"}:
                    </span>{" "}
                    {selectedTenant.end_date
                      ? formatDate(selectedTenant.end_date)
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <EditTenantDialog
            tenant={editingTenant}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            propertyId={propertyId!}
          />

          <CreateTenancyWizard
            open={showTenancyWizard}
            onOpenChange={(open) => {
              if (!open && submissionInProgress) return;
              setShowTenancyWizard(open);
              if (!open) {
                setWizardInitialData(null);
                setWizardMode("new");
              }
            }}
            propertyId={propertyId!}
            propertyCountry={property?.country ?? undefined}
            templates={templates}
            onSubmit={handleWizardSubmit}
            onSaveAndStartAnother={handleSaveAndStartAnother}
            isSubmitting={submissionInProgress}
            initialData={wizardInitialData}
            mode={wizardMode}
          />

          <AlertDialog open={cancelSetupOpen} onOpenChange={setCancelSetupOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("tenancy.deleteDraftSetupTitle") || "Delete Draft Setup?"}
                </AlertDialogTitle>
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
        </TabsContent>

        <TabsContent value="payments" className="pt-6 space-y-4">
          <TenantStatusPills value={tenantFilter} onChange={setTenantFilter} />
          <PaymentsTab
            currentTenant={activeTenantWithProfile}
            allTenants={allTenants}
            tenantFilter={tenantFilter}
            propertyId={propertyId!}
            userRole={userRole}
            requirementsRentAmountCents={requirements?.find(r => r.status !== 'cancelled' && r.rent_amount_cents)?.rent_amount_cents}
          />
        </TabsContent>

        <TabsContent value="costs" className="pt-6 space-y-4">
          <CostsTab
            propertyId={propertyId!}
            userRole={userRole}
            propertyCreatedAt={property?.createdAt}
          />
        </TabsContent>

        <TabsContent value="tickets" className="pt-6 space-y-4">
          <TenantStatusPills value={tenantFilter} onChange={setTenantFilter} />
          <TicketsTab
            propertyId={propertyId!}
            tenancyId={selectedTenant?.id}
            isManager={userRole?.isManager}
          />
        </TabsContent>

        <TabsContent value="financial" className="pt-6 space-y-4">
          <FinancialAnalysisTab
            propertyId={propertyId!}
            allTenants={allTenants}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
