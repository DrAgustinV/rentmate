import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building, Users } from "lucide-react";
import { OverviewTab } from "@/components/property-hub/OverviewTab";
import { useLanguage } from "@/contexts/LanguageContext";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function PropertyOverview() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);

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

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: allTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["property-tenants", propertyId],
    queryFn: async () => {
      const { data: tenancies, error } = await supabase
        .from("property_tenants")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!tenancies) return [];

      const tenantIds = tenancies
        .map((t) => t.tenant_id)
        .filter((id) => id);

      let profiles: Record<string, { id: string; email: string; first_name: string | null; last_name: string | null; avatar_url: string | null; kyc_status: string | null }> = {};

      if (tenantIds.length > 0) {
        try {
          const { data: profileData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name, avatar_url, kyc_status")
            .in("id", tenantIds);

          if (!profilesError && profileData) {
            profileData.forEach((p) => {
              profiles[p.id] = p;
            });
          }
        } catch (e) {
          console.warn("Could not fetch profiles:", e);
        }
      }

      return tenancies.map((tenancy) => {
        const profile = tenancy.tenant_id ? profiles[tenancy.tenant_id] : null;
        
        let email = "Unknown";
        if (tenancy.tenancy_status === 'pending' && tenancy.notes) {
          const match = tenancy.notes.match(/sent to (.+@.+)/);
          email = match ? match[1] : "Pending";
        } else if (profile?.email) {
          email = profile.email;
        }
        
        return {
          ...tenancy,
          email,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          kyc_status: profile?.kyc_status || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  const { data: invitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!propertyId && !!userId,
  });

  const { data: templates } = useQuery({
    queryKey: ["contract-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("id, document_title")
        .eq("document_category", "template")
        .or(`property_id.eq.${propertyId},property_id.is.null`)
        .eq("is_latest_version", true)
        .order("document_title");
      if (error) throw error;
      return data as Array<{ id: string; document_title: string }>;
    },
    enabled: !!propertyId,
  });

  const selectableTenants = allTenants?.filter(t => t.tenancy_status !== 'historic') || [];
  const currentTenant = selectableTenants.length > 0 ? selectableTenants[0] : null;
  const isHistoricView = currentTenant?.tenancy_status === 'historic';

  const userRole = {
    isManager: true,
    userId: userId || undefined,
  };

  const loading = propertyLoading || tenantsLoading;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}>
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
          <Button variant="outline" className="mt-4" onClick={() => navigate('/properties')}>
            {t("common.backToList")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/properties')} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          {t("properties.backToList") || "Back to Properties"}
        </Button>
      </div>
      
      <OverviewTab
        property={property}
        propertyId={propertyId!}
        userRole={userRole}
        activeTenant={currentTenant}
        templates={templates || []}
        invitations={invitations || []}
        hasNoTenants={!allTenants || allTenants.length === 0}
      />
    </AppLayout>
  );
}