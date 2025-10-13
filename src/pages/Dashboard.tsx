import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Plus, Home, Users, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PropertyCard } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenantProperties, setTenantProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<"active" | "archived">("active");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const activeProperties = properties.filter(p => p.status === "active");
  const archivedProperties = properties.filter(p => p.status === "inactive");
  const displayedProperties = propertyView === "active" ? activeProperties : archivedProperties;

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
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
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
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Home className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.manageProperties')}</h3>
              <p className="text-muted-foreground mb-4">{t('dashboard.managePropertiesDesc')}</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('dashboard.createProperty')}
              </Button>
            </div>

            {/* Card 2: Waiting for Access */}
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Users className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.tenantAccess')}</h3>
              <p className="text-muted-foreground">{t('dashboard.tenantAccessDesc')}</p>
            </div>
          </div>
        )}

        {/* My Properties Section - Only show if user has managed properties */}
        {properties.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <Home className="h-8 w-8 text-primary" />
                  {t('dashboard.myProperties')}
                </h2>
                <p className="text-muted-foreground mt-1">{t('dashboard.myPropertiesDesc')}</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('dashboard.createProperty')}
              </Button>
            </div>

            <div className="mb-6">
              <ArchiveToggle
                activeCount={activeProperties.length}
                archivedCount={archivedProperties.length}
                currentView={propertyView}
                onViewChange={setPropertyView}
              />
            </div>

            {displayedProperties.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {propertyView === "active" ? t('dashboard.noActiveProperties') : t('dashboard.noArchivedProperties')}
                </h3>
                <p className="text-muted-foreground">
                  {propertyView === "active" 
                    ? t('dashboard.allPropertiesArchived')
                    : t('dashboard.noArchivedProperties')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProperties.map((property) => (
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