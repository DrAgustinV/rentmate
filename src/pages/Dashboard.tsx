import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Plus, Home, Users, Archive } from "lucide-react";
import { toast } from "sonner";
import { PropertyCard } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenantProperties, setTenantProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter(p => {
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProperties(session.user.id);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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
        setMaxPropertiesLimit(parseInt((data.setting_value as any).value));
      }
    };
    fetchPropertyLimit();
  }, []);

  const fetchProperties = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch managed properties
      const { data: managed, error: managedError } = await supabase
        .from("properties")
        .select("*")
        .eq("manager_id", userId)
        .order("created_at", { ascending: false });

      if (managedError) throw managedError;

      // Fetch tenant properties
      const { data: tenantRels, error: tenantError } = await supabase
        .from("property_tenants")
        .select("property_id")
        .eq("tenant_id", userId);

      if (tenantError) throw tenantError;

      if (tenantRels && tenantRels.length > 0) {
        const propertyIds = tenantRels.map((rel) => rel.property_id);
        const { data: tenant, error: tenantPropsError } = await supabase
          .from("properties")
          .select("*")
          .in("id", propertyIds)
          .order("created_at", { ascending: false });

        if (tenantPropsError) throw tenantPropsError;
        setTenantProperties(tenant || []);
      }

      setProperties(managed || []);
    } catch (error: any) {
      toast.error(t('common.error'), {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <AppLayout showBreadcrumbs={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBreadcrumbs={false}>
        {/* Empty State: No managed properties AND no tenant properties */}
        {properties.length === 0 && tenantProperties.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Card 1: Create Property */}
            <div className="text-center py-12 bg-gradient-to-br from-card to-secondary/20 border border-border rounded-lg hover-lift animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.manageProperties')}</h3>
              <p className="text-muted-foreground mb-4 px-4">{t('dashboard.managePropertiesDesc')}</p>
              <Button variant="default" onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('dashboard.createProperty')}
              </Button>
            </div>

            {/* Card 2: Waiting for Access */}
            <div className="text-center py-12 bg-gradient-to-br from-card to-secondary/20 border border-border rounded-lg hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.tenantAccess')}</h3>
              <p className="text-muted-foreground px-4">{t('dashboard.tenantAccessDesc')}</p>
            </div>
          </div>
        )}

        {/* My Properties Section - Only show if user has managed properties */}
        {properties.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Home className="h-8 w-8 text-primary" />
                  {t('dashboard.myProperties')}
                </h1>
                <p className="text-muted-foreground mt-1">{t('dashboard.myPropertiesDesc')}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button 
                  variant="default"
                  onClick={() => setIsCreateOpen(true)} 
                  disabled={activeProperties.length >= maxPropertiesLimit}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('dashboard.createProperty')}
                </Button>
                {activeProperties.length >= maxPropertiesLimit && (
                  <p className="text-sm text-muted-foreground">
                    Property limit reached ({maxPropertiesLimit} properties)
                  </p>
                )}
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <ArchiveToggle
                activeCount={activeProperties.length}
                endingTenancyCount={endingTenancyProperties.length}
                archivedCount={archivedProperties.length}
                currentView={propertyView}
                onViewChange={setPropertyView}
              />
              
              <SearchFilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            {filteredAndSortedProperties.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-card to-secondary/20 border border-border rounded-lg animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                  <Archive className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {debouncedSearch ? "No properties match your search" :
                    propertyView === "active" ? t('dashboard.noActiveProperties') :
                    propertyView === "ending_tenancy" ? "No properties ending tenancy" :
                    t('dashboard.noArchivedProperties')
                  }
                </h3>
                <p className="text-muted-foreground px-4">
                  {debouncedSearch ? "Try adjusting your search terms" :
                    propertyView === "active" ? "All properties are either ending tenancy or archived" :
                    propertyView === "ending_tenancy" ? "No properties are currently ending tenancy" :
                    t('dashboard.noArchivedProperties')
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isManager={true}
                    onUpdate={() => fetchProperties(user!.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tenant Properties Section - Only show if user has tenant properties */}
        {tenantProperties.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Users className="h-7 w-7 text-accent" />
              {t('dashboard.tenantProperties')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenantProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isManager={false}
                  onUpdate={() => fetchProperties(user!.id)}
                />
              ))}
            </div>
          </div>
        )}

      <CreatePropertyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          if (user) fetchProperties(user.id);
        }}
      />
    </AppLayout>
  );
}