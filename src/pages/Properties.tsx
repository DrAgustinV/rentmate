import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, Archive, Upload, Zap, Ticket, Wrench, ImageIcon, Search } from "lucide-react";
import { PropertyCard, PropertyStatusIndicators, TenantStatusInfo } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useProperties } from "@/hooks/useProperties";
import { OccupancyBadge, PaymentBadge, TicketCount } from "@/components/ui/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { propertyService, authService } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";
import { getCachedSignedUrl } from "@/lib/signedUrlCache";

export default function Properties() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then((user) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: propertiesData, isLoading } = useProperties({
    managerId: userId || undefined,
  });
  const [propertyView, setPropertyView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [maxPropertiesLimit] = useState(5);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [propertyPhotoUrls, setPropertyPhotoUrls] = useState<Record<string, string>>({});
  const [statusIndicators, setStatusIndicators] = useState<Record<string, PropertyStatusIndicators>>({});
  const [tenantStatusMap, setTenantStatusMap] = useState<Record<string, TenantStatusInfo | null>>({});

  useEffect(() => {
    let mounted = true;

    const fetchPropertyData = async () => {
      const propertyList = propertiesData?.properties;
      if (!propertyList || propertyList.length === 0) return;

      const [urls, indicators, tenantStatuses] = await Promise.all([
        Promise.all(
          propertyList
            .filter(p => p.images?.[0])
            .map(async (property) => {
              try {
                const url = await getCachedSignedUrl(
                  STORAGE_BUCKETS.PROPERTY_PHOTOS,
                  property.images![0],
                  SIGNED_URL_TTL
                );
                return [property.id, url];
              } catch (e) {
                return [property.id, null];
              }
            })
        ).then(Object.fromEntries),
        Promise.all(
          propertyList.map(async (property) => {
            try {
              const indicator = await propertyService.getPropertyStatusIndicators(property.id);
              return [property.id, indicator];
            } catch (error) {
              return [property.id, null];
            }
          })
        ).then(Object.fromEntries),
        Promise.all(
          propertyList.map(async (property) => {
            try {
              const status = await propertyService.getPropertyTenantStatus(property.id);
              return [property.id, status];
            } catch (error) {
              return [property.id, null];
            }
          })
        ).then(Object.fromEntries)
      ]);

      if (mounted) {
        setPropertyPhotoUrls(urls as Record<string, string>);
        setStatusIndicators(indicators as Record<string, PropertyStatusIndicators>);
        setTenantStatusMap(tenantStatuses as Record<string, TenantStatusInfo | null>);
      }
    };

    fetchPropertyData();
    return () => { mounted = false; };
  }, [propertiesData]);

  const activeProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "active") || [];
  }, [propertiesData]);

  const endingTenancyProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "ending_tenancy") || [];
  }, [propertiesData]);

  const archivedProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "inactive") || [];
  }, [propertiesData]);

  const filteredAndSortedProperties = useMemo(() => {
    let properties = activeProperties;
    
    if (propertyView === "ending_tenancy") {
      properties = endingTenancyProperties;
    } else if (propertyView === "archived") {
      properties = archivedProperties;
    }

    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      properties = properties.filter(p => 
        p.title.toLowerCase().includes(lowerSearch) ||
        p.address?.toLowerCase().includes(lowerSearch) ||
        p.city?.toLowerCase().includes(lowerSearch)
      );
    }

    return properties.sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeProperties, endingTenancyProperties, archivedProperties, debouncedSearch, sortBy, propertyView]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
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
              >
                <Upload className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button
                variant="default"
                onClick={() => setIsCreateOpen(true)}
                disabled={activeProperties.length >= maxPropertiesLimit}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("dashboard.createProperty")}
              </Button>
            </div>
            {activeProperties.length >= maxPropertiesLimit && (
              <p className="text-sm text-muted-foreground">Property limit reached ({maxPropertiesLimit} properties)</p>
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
            title="No properties ending tenancy"
            description="No properties are currently ending tenancy"
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
        onSuccess={() => {
          setIsCreateOpen(false);
        }}
      />
    </AppLayout>
  );
}
