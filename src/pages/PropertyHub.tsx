import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Building } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { OverviewTab } from "@/components/property-hub/OverviewTab";
import { PaymentsTab } from "@/components/property-tenants/PaymentsTab";
import { TicketsTab } from "@/components/property-tenants/TicketsTab";
import { usePropertyTenantsData } from "@/hooks/usePropertyTenants";
import { TenantStatusPills } from "@/components/property-hub/TenantStatusPills";
import { filterTenantsByPill, type TenantFilter } from "@/lib/tenantFilterUtils";
import { StatusBadge } from "@/components/property-tenants/StatusBadge";
import { getTenancyDisplayLabel } from "@/lib/tenancyStatus";

export default function PropertyHub() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  const [tenantFilter, setTenantFilter] = useState<TenantFilter>("current");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

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
  } = usePropertyTenantsData(propertyId, t);

  const filteredTenants = useMemo(
    () => filterTenantsByPill(allTenants || [], tenantFilter),
    [allTenants, tenantFilter],
  );

  const selectedTenant = useMemo(
    () => allTenants?.find((t) => t.id === selectedTenantId) || null,
    [allTenants, selectedTenantId],
  );

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
          <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t("propertyHub.tabs.tickets") || "Tickets"}
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
          <TenantStatusPills value={tenantFilter} onChange={setTenantFilter} />

          {/* List View */}
          {!selectedTenantId && (
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
                    <th className="w-[80px] px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        {t("tenants.noTenants") || "No tenants match this filter"}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
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
                            ? new Date(tenant.started_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTenantId(tenant.id);
                            }}
                          >
                            {t("common.edit") || "Edit"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                      ? new Date(selectedTenant.started_at).toLocaleDateString()
                      : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("tenancy.plannedEnd") || "End Date"}:
                    </span>{" "}
                    {selectedTenant.end_date
                      ? new Date(selectedTenant.end_date).toLocaleDateString()
                      : "—"}
                  </div>
                  {(selectedTenant.tenancy_status === "active" || selectedTenant.tenancy_status === "pending") && (
                    <div className="col-span-2 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("tenancy.editingNote") ||
                          "Editable fields for friendly agreement flexibility. Legally binding data stays in the contract."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("tenancy.editHint") ||
                          "Full tenant data editing (name, contact, rental terms) will be available here."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="pt-6 space-y-4">
          <TenantStatusPills value={tenantFilter} onChange={setTenantFilter} />
          <PaymentsTab
            currentTenant={activeTenantWithProfile}
            propertyId={propertyId!}
            userRole={userRole}
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
      </Tabs>
    </AppLayout>
  );
}
