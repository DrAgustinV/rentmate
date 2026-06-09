import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Building, Archive, Upload, ImageIcon, Search } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { OccupancyBadge, PaymentBadge, TicketCount } from "@/components/ui/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePropertyDashboard, MAX_PROPERTIES_LIMIT } from "@/hooks/usePropertyDashboard";
import { authService } from "@/services";
import { OnboardingTour } from "@/components/welcome/OnboardingTour";
import { shouldShowTour } from "@/services/profileService";

export default function Properties() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tourTrigger, setTourTrigger] = useState(0);
  const [runTour, setRunTour] = useState(false);
  const processedParams = useRef<string | null>(null);

  const {
    propertiesData,
    isLoading,
    propertyPhotoUrls,
    statusIndicators,
    tenantStatusMap,
    propertyView,
    setPropertyView,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    sortBy,
    setSortBy,
    activeProperties,
    endingTenancyProperties,
    archivedProperties,
    filteredProperties: filteredAndSortedProperties,
  } = usePropertyDashboard();

  useEffect(() => {
    const currentParams = searchParams.toString();
    if (currentParams === processedParams.current) return;
    processedParams.current = currentParams;

    const processUrlParams = async () => {
      const user = await authService.getCurrentUser();
      if (!user) return;

      setUserId(user.id);

      const showTourParam = searchParams.get("tour") === "true";
      if (showTourParam) {
        searchParams.delete("tour");
        setSearchParams(searchParams, { replace: true });
        setRunTour(true);
        return;
      }

      const shouldShowTourOnLoad = await shouldShowTour(user.id);
      if (shouldShowTourOnLoad) {
        setRunTour(true);
        return;
      }

      const guideHighlight = searchParams.get("guideHighlight");
      if (guideHighlight === "add-property") {
        setIsCreateOpen(true);
        searchParams.delete("guideHighlight");
        setSearchParams(searchParams, { replace: true });
        return;
      }
      if (guideHighlight === "add-tenant") {
        if (propertiesData && propertiesData.length > 0) {
          const firstPropertyId = propertiesData[0].id;
            navigate(`/properties/${firstPropertyId}?tab=tenants&action=newTenancy`);
        }
        searchParams.delete("guideHighlight");
        setSearchParams(searchParams, { replace: true });
      }
    };

    processUrlParams();
  }, [searchParams, setSearchParams, navigate, propertiesData]);

  const handleTourFinish = () => {
    setRunTour(false);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSkeleton preset="card-grid" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-tour="properties-header">
              <Building className="h-8 w-8 text-primary" />
              {t("properties.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("properties.description")}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/import')}
                className="gap-2"
                data-tour="bulk-import-btn"
              >
                <Upload className="h-4 w-4" />
                {t("common.bulkImport")}
              </Button>
              <Button
                variant="default"
                onClick={() => setIsCreateOpen(true)}
                disabled={activeProperties.length >= MAX_PROPERTIES_LIMIT}
                className="gap-2"
                data-tour="add-property-btn"
              >
                <Plus className="h-4 w-4" />
                {t("dashboard.createProperty")}
              </Button>
            </div>
            {activeProperties.length >= MAX_PROPERTIES_LIMIT && (
              <p className="text-sm text-muted-foreground">Property limit reached ({MAX_PROPERTIES_LIMIT} properties)</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <ArchiveToggle
          activeCount={activeProperties.length}
          endingTenancyCount={endingTenancyProperties.length}
          archivedCount={archivedProperties.length}
          currentView={propertyView}
          onViewChange={setPropertyView}
          showEndingTenancy={false}
        />

        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {filteredAndSortedProperties.length === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={Search}
            title={t('properties.noResults')}
            description={t('properties.noResultsDesc')}
          />
        ) : propertyView === "active" ? (
          <EmptyState
            icon={Building}
            title={t("dashboard.noActiveProperties")}
            description={t("dashboard.getStarted")}
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard.createProperty")}
              </Button>
            }
          />
        ) : propertyView === "ending_tenancy" ? (
          <EmptyState
            icon={Archive}
            title={t("properties.endingTenancy.emptyTitle")}
            description={t("properties.endingTenancy.emptyDesc")}
          />
        ) : (
          <EmptyState
            icon={Archive}
            title={t("dashboard.noArchivedProperties")}
            description={t("dashboard.allPropertiesArchived")}
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredAndSortedProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isManager={true}
              onUpdate={() => {}}
              statusIndicators={statusIndicators[property.id]}
              tenantStatus={tenantStatusMap[property.id] ?? null}
              isTenantStatusLoading={!propertiesData || Object.keys(tenantStatusMap).length === 0}
              photoUrl={propertyPhotoUrls[property.id]}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">{t('properties.photo')}</TableHead>
                <TableHead>{t('properties.propertyTitle')}</TableHead>
                <TableHead className="hidden md:table-cell">Occupancy</TableHead>
                <TableHead className="hidden lg:table-cell">Tenant</TableHead>
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
                <TableHead>Tickets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProperties.map((property) => {
                const tenantStatus = tenantStatusMap[property.id];
                const indicators = statusIndicators[property.id];
                const occupancyStatus = tenantStatus?.status === 'occupied' ? 'Occupied' :
                  tenantStatus?.status === 'invited' ? 'Invited' : 'Vacant';
                const paymentStatus = indicators?.rent_overdue ? 'Due' : 'Paid';
                const ticketCount = indicators?.tickets_open ? 1 : 0;
                return (
                  <TableRow key={property.id} className="hover:bg-muted/50">
                    <TableCell className="w-14">
                      {propertyPhotoUrls[property.id] ? (
                        <img
                          src={propertyPhotoUrls[property.id]}
                          alt={property.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell
                      className="font-medium cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/properties/${property.id}/overview`)}
                    >
                      <div>{property.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {property.address ? `${property.address}, ${property.city || ''}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/properties/${property.id}/tenants?tab=contracts`)}
                    >
                      <OccupancyBadge status={occupancyStatus} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {tenantStatus?.tenant_name || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {indicators?.rent_has_data ? (
                        <PaymentBadge status={paymentStatus} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <TicketCount count={ticketCount} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePropertyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(propertyId) => {
          setIsCreateOpen(false);
          if (activeProperties.length === 0) {
            navigate(`/properties/${propertyId}?tab=tenants&action=newTenancy`);
          }
        }}
      />

      {userId && <OnboardingTour userId={userId} run={runTour} onFinish={handleTourFinish} />}
    </AppLayout>
  );
}
