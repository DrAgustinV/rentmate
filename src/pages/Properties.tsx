import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Building, Archive } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useProperties } from "@/hooks/useProperties";

export default function Properties() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: propertiesData, isLoading } = useProperties({
    managerId: userId || undefined,
  });

  const properties = propertiesData?.properties || [];

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
      setUserId(session.user.id);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
        setMaxPropertiesLimit(parseInt((data.setting_value as any).value));
      }
    };
    fetchPropertyLimit();
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
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
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building className="h-8 w-8 text-primary" />
              {t('properties.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('properties.description')}</p>
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
              onUpdate={() => {}}
            />
          ))}
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
