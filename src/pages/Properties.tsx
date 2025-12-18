import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, Archive, Upload, Zap, Ticket, Wrench, ImageIcon } from "lucide-react";
import { PropertyCard, PropertyStatusIndicators } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useProperties } from "@/hooks/useProperties";
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

export default function Properties() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical" | "status">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusIndicators, setStatusIndicators] = useState<Record<string, PropertyStatusIndicators>>({});
  const [propertyPhotoUrls, setPropertyPhotoUrls] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { t } = useLanguage();

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: propertiesData, isLoading } = useProperties({
    managerId: userId || undefined,
  });

  const properties = propertiesData?.properties || [];

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter((p) => {
      const matchesStatus =
        propertyView === "active"
          ? p.status === "active"
          : propertyView === "ending_tenancy"
            ? p.status === "ending_tenancy"
            : p.status === "inactive";

      if (!matchesStatus) return false;

      if (!debouncedSearch) return true;

      const searchLower = debouncedSearch.toLowerCase();
      return (
        p.title?.toLowerCase().includes(searchLower) ||
        p.address?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "status") {
        // Sort by occupancy: properties with tenants first, then vacant
        const aHasTenant = statusIndicators[a.id]?.rent_has_data ? 0 : 1;
        const bHasTenant = statusIndicators[b.id]?.rent_has_data ? 0 : 1;
        return aHasTenant - bHasTenant;
      } else {
        return (a.title || "").localeCompare(b.title || "");
      }
    });

    return filtered;
  }, [properties, propertyView, debouncedSearch, sortBy, statusIndicators]);

  const activeProperties = properties.filter((p) => p.status === "active");
  const endingTenancyProperties = properties.filter((p) => p.status === "ending_tenancy");
  const archivedProperties = properties.filter((p) => p.status === "inactive");

  // Fetch status indicators in batch for all properties
  useEffect(() => {
    const fetchStatusIndicators = async () => {
      const propertyList = propertiesData?.properties;
      if (!propertyList || propertyList.length === 0) return;
      
      const propertyIds = propertyList.map(p => p.id);
      const { data, error } = await supabase.rpc('get_properties_status_indicators', { 
        p_property_ids: propertyIds 
      });
      
      if (error) {
        console.error('Error fetching status indicators:', error);
        return;
      }
      
      if (data) {
        const indicatorsMap: Record<string, PropertyStatusIndicators> = {};
        data.forEach((row: PropertyStatusIndicators) => {
          indicatorsMap[row.property_id] = row;
        });
        setStatusIndicators(indicatorsMap);
      }
    };

    fetchStatusIndicators();
  }, [propertiesData]);

  // Fetch photo URLs for all properties
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const propertyList = propertiesData?.properties;
      if (!propertyList || propertyList.length === 0) return;
      
      const urls: Record<string, string> = {};
      const photosToFetch = propertyList.filter(p => p.images?.[0]);
      
      await Promise.all(
        photosToFetch.map(async (property) => {
          const { data } = await supabase.storage
            .from('property-photos')
            .createSignedUrl(property.images![0], 3600);
          if (data) {
            urls[property.id] = data.signedUrl;
          }
        })
      );
      
      setPropertyPhotoUrls(urls);
    };

    fetchPhotoUrls();
  }, [propertiesData]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
        setUserId(null);
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchPropertyLimit = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "max_active_properties_per_user")
        .maybeSingle();

      if (data) {
        setMaxPropertiesLimit(parseInt((data.setting_value as any).value));
      }
    };
    fetchPropertyLimit();
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "ending_tenancy":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "outline";
    }
  };

  const StatusIndicatorsCell = ({ indicators }: { indicators?: PropertyStatusIndicators }) => (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Zap className={cn(
              "h-3.5 w-3.5 cursor-help transition-colors",
              !indicators?.utility_has_data ? "text-muted-foreground/40" :
              indicators.utility_overdue ? "text-red-500" : "text-green-500"
            )} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {t('properties.utilityPayments')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Ticket className={cn(
              "h-3.5 w-3.5 cursor-help transition-colors",
              !indicators?.tickets_has_data ? "text-muted-foreground/40" :
              indicators.tickets_open ? "text-yellow-500" : "text-green-500"
            )} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {t('properties.openTickets')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Wrench className={cn(
              "h-3.5 w-3.5 cursor-help transition-colors",
              !indicators?.maintenance_has_data ? "text-muted-foreground/40" :
              indicators.maintenance_overdue ? "text-red-500" : "text-green-500"
            )} />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {t('properties.maintenanceTasks')}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
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
        <div className="text-center py-16 bg-gradient-to-br from-card to-secondary/20 border border-border rounded-lg animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {debouncedSearch
              ? "No properties match your search"
              : propertyView === "active"
                ? t("dashboard.noActiveProperties")
                : propertyView === "ending_tenancy"
                  ? "No properties ending tenancy"
                  : t("dashboard.noArchivedProperties")}
          </h3>
          <p className="text-muted-foreground px-4">
            {debouncedSearch
              ? "Try adjusting your search terms"
              : propertyView === "active"
                ? "All properties are either ending tenancy or archived"
                : propertyView === "ending_tenancy"
                  ? "No properties are currently ending tenancy"
                  : t("dashboard.noArchivedProperties")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredAndSortedProperties.map((property) => (
            <PropertyCard 
              key={property.id} 
              property={property} 
              isManager={true} 
              onUpdate={() => {}} 
              statusIndicators={statusIndicators[property.id]}
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
                <TableHead className="hidden md:table-cell">{t('properties.address')}</TableHead>
                <TableHead>{t('properties.status')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('search.status')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('properties.created')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProperties.map((property) => (
                <TableRow 
                  key={property.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/properties/${property.id}/tenants`)}
                >
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
                  <TableCell className="font-medium">{property.title}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {property.address ? `${property.address}, ${property.city || ''}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(property.status)}>
                      {property.status === 'active' ? t('dashboard.active') : 
                       property.status === 'ending_tenancy' ? 'Ending' : t('dashboard.archived')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusIndicatorsCell indicators={statusIndicators[property.id]} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {format(new Date(property.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
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
