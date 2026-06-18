import { useEffect, useState, useMemo } from "react";
import { authService, propertyService } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";
import { getCachedSignedUrl } from "@/lib/signedUrlCache";
import { useProperties } from "@/hooks/useProperties";
import { useDebounce } from "@/hooks/useDebounce";
import type { PropertyDomain } from "@/types/domain";
import type { PropertyStatusIndicators, TenantStatusInfo } from "@/components/PropertyCard";

export const MAX_PROPERTIES_LIMIT = 5;

interface UsePropertyDashboardReturn {
  userId: string | null;
  propertiesData: { properties: PropertyDomain[]; totalCount: number; totalPages: number } | undefined;
  isLoading: boolean;
  propertyPhotoUrls: Record<string, string>;
  statusIndicators: Record<string, PropertyStatusIndicators>;
  tenantStatusMap: Record<string, TenantStatusInfo | null>;
  propertyView: "active" | "ending" | "historic";
  setPropertyView: (view: "active" | "ending" | "historic") => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearch: string;
  sortBy: "name" | "createdAt";
  setSortBy: (sort: "name" | "createdAt") => void;
  activeProperties: PropertyDomain[];
  endingTenancyProperties: PropertyDomain[];
  archivedProperties: PropertyDomain[];
  filteredProperties: PropertyDomain[];
  maxPropertiesLimit: number;
}

export function usePropertyDashboard(): UsePropertyDashboardReturn {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then((user) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: propertiesData, isLoading } = useProperties({
    managerId: userId || undefined,
  });

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
                return [property.id, url] as const;
              } catch {
                return [property.id, null] as const;
              }
            })
        ).then(entries => Object.fromEntries(entries)),
        Promise.all(
          propertyList.map(async (property) => {
            try {
              const indicator = await propertyService.getPropertyStatusIndicators(property.id);
              return [property.id, indicator] as const;
            } catch {
              return [property.id, null] as const;
            }
          })
        ).then(entries => Object.fromEntries(entries)),
        Promise.all(
          propertyList.map(async (property) => {
            try {
              const status = await propertyService.getPropertyTenantStatus(property.id);
              return [property.id, status] as const;
            } catch {
              return [property.id, null] as const;
            }
          })
        ).then(entries => Object.fromEntries(entries)),
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

  const [propertyView, setPropertyView] = useState<"active" | "ending" | "historic">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    window.innerWidth >= 768 ? "list" : "grid"
  );

  const debouncedSearch = useDebounce(searchTerm, 300);

  const activeProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "active") || [];
  }, [propertiesData]);

  const endingTenancyProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "ending_tenancy") || [];
  }, [propertiesData]);

  const archivedProperties = useMemo(() => {
    return propertiesData?.properties?.filter(p => p.status === "inactive") || [];
  }, [propertiesData]);

  const filteredProperties = useMemo(() => {
    let properties = activeProperties;

    if (propertyView === "ending") {
      properties = endingTenancyProperties;
    } else if (propertyView === "historic") {
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

  return {
    userId,
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
    filteredProperties,
    maxPropertiesLimit: MAX_PROPERTIES_LIMIT,
  };
}
