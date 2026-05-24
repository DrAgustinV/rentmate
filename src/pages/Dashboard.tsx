import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, tenantService } from "@/services";
import { Button } from "@/components/ui/button";
import { Plus, Home, Users, Archive, Building2 } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useProperties } from "@/hooks/useProperties";
import { useTenantProperties } from "@/hooks/useTenantProperties";

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch managed properties using React Query
  const { data: propertiesData, isLoading: isLoadingProperties } = useProperties({
    managerId: userId || undefined,
  });

  // Fetch tenant properties using React Query
  const { data: tenantPropertiesData, isLoading: isLoadingTenantProperties } = useTenantProperties({
    tenantId: userId || undefined,
  });

  const properties = useMemo(() => propertiesData?.properties || [], [propertiesData]);
  const tenantProperties = useMemo(() => tenantPropertiesData?.properties || [], [tenantPropertiesData]);
  const loading = isLoadingProperties || isLoadingTenantProperties;

  const filteredAndSortedProperties = useMemo(() => {
    const filtered = properties.filter(p => {
      const matchesStatus = 
        propertyView === "active" ? p.status === "active" :
        propertyView === "ending_tenancy" ? p.status === "ending_tenancy" :
        p.status === "inactive";
      
      if (!matchesStatus) return false;
      
      if (!debouncedSearch) return true;
      
      const searchLower = debouncedSearch.toLowerCase();
      return (
        p.title?.toLowerCase().includes(searchLower) ||
        p.address?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    });
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return (a.title || '').localeCompare(b.title || '');
      }
    });
    
    return filtered;
  }, [properties, propertyView, debouncedSearch, sortBy]);
  
  const activeProperties = properties.filter(p => p.status === "active");
  const endingTenancyProperties = properties.filter(p => p.status === "ending_tenancy");
  const archivedProperties = properties.filter(p => p.status === "inactive");

  useEffect(() => {
    const checkUser = async () => {
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      
      // Check if user is a manager
      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("manager_id", session.user.id)
        .limit(1);
      
      if (properties && properties.length > 0) {
        navigate("/properties", { replace: true });
        return;
      }

      // Check if user is a tenant using tenantService
      const tenantTenancies = await tenantService.getTenanciesByTenant(session.user.id);
      if (tenantTenancies.length > 0) {
        navigate("/rentals", { replace: true });
        return;
      }
      
      // New user with no properties/tenancies - redirect to properties page
      navigate("/properties", { replace: true });
    };

    checkUser();

    const subscription = authService.onAuthStateChange((_event, session) => {
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
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'max_active_properties_per_user')
        .maybeSingle();
      
      if (data) {
        setMaxPropertiesLimit(parseInt((data.setting_value as { value: number }).value));
      }
    };
    fetchPropertyLimit();
  }, []);

  if (loading) {
    return (
      <AppLayout showBreadcrumbs={false}>
        <LoadingSkeleton preset="page" />
      </AppLayout>
    );
  }

  const hasNoProperties = activeProperties.length === 0 && tenantProperties.length === 0;

  return (
    <AppLayout showBreadcrumbs={false}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('header.dashboard')}</h1>
        <p className="text-muted-foreground mt-1">Welcome to your dashboard</p>
      </div>

      {hasNoProperties ? (
        <EmptyState
          icon={Building2}
          title={t('dashboard.getStarted')}
          description={t('dashboard.getStartedDesc')}
          action={
            <Button onClick={() => navigate('/properties')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.addFirstProperty')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Properties</h3>
              <p className="text-3xl font-bold">{activeProperties.length}</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Rentals</h3>
              <p className="text-3xl font-bold">{tenantProperties.length}</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Total</h3>
              <p className="text-3xl font-bold">{activeProperties.length + tenantProperties.length}</p>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
