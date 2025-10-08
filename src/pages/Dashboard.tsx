import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Home, Users, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { PropertyCard } from "@/components/PropertyCard";
import { CreatePropertyDialog } from "@/components/CreatePropertyDialog";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenantProperties, setTenantProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProperties(session.user.id);
      await fetchPendingInvitations();
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) return;

      const { count } = await supabase
        .from("invitations")
        .select("*", { count: "exact", head: true })
        .eq("email", profile.email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      setPendingInvitations(count || 0);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlatMate
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/invitations")} className="relative">
              <Mail className="mr-2 h-4 w-4" />
              Invitations
              {pendingInvitations > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                  {pendingInvitations}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Home className="h-8 w-8 text-primary" />
                My Properties
              </h2>
              <p className="text-muted-foreground mt-1">Properties you manage</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Property
            </Button>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
              <p className="text-muted-foreground mb-4">Create your first property to get started</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Property
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
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

        {tenantProperties.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
              <Users className="h-7 w-7 text-accent" />
              Tenant Properties
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
      </main>

      <CreatePropertyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          if (user) fetchProperties(user.id);
        }}
      />
    </div>
  );
}