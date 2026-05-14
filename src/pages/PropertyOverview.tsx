import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building } from "lucide-react";
import { OverviewTab } from "@/components/property-hub/OverviewTab";
import { useLanguage } from "@/contexts/LanguageContext";
import { propertyService, tenantService, documentService, authService } from "@/services";

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
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
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

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      return propertyService.getProperty(propertyId);
    },
    enabled: !!propertyId,
  });

  const { data: allTenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["property-tenants", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const tenancies = await tenantService.getTenanciesByProperty(propertyId);

      return tenancies.map((tenancy) => {
        let email = tenancy.tenantEmail || "Unknown";
        if (tenancy.status === 'pending' && tenancy.notes) {
          const match = tenancy.notes.match(/sent to (.+@.+)/);
          email = match ? match[1] : "Pending";
        }

        return {
          id: tenancy.id,
          tenant_id: tenancy.tenantId || "",
          tenancy_status: tenancy.status as Tenant['tenancy_status'],
          started_at: tenancy.startDate,
          ended_at: tenancy.endedAt,
          planned_ending_date: tenancy.plannedEndDate,
          email,
          first_name: tenancy.tenantFirstName,
          last_name: tenancy.tenantLastName,
          notes: tenancy.notes,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  const { data: invitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];

      const result = await tenantService.getInvitationsByProperty(propertyId, { status: 'pending' });

      const now = new Date().toISOString();
      const filtered = result.filter((inv) => inv.expiresAt > now);

      return filtered.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        expires_at: inv.expiresAt,
        created_at: inv.createdAt,
      })) as Invitation[];
    },
    enabled: !!propertyId && !!userId,
  });

  const { data: templates } = useQuery({
    queryKey: ["contract-templates", propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      return documentService.getTemplatesByProperty(propertyId);
    },
    enabled: !!propertyId,
  });

  const selectableTenants = allTenants?.filter(t => t.tenancy_status !== 'historic') || [];
  const currentTenant = selectableTenants.length > 0 ? selectableTenants[0] : null;

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
