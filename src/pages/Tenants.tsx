import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Building, ExternalLink, CalendarDays } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { tenantService } from "@/services/tenantService";
import { authService } from "@/services";
import { formatDate } from "@/lib/dateUtils";
import type { TenancyDomain } from "@/types/domain";

function TenancyRow({ tenancy }: { tenancy: TenancyDomain }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const statusLabel = tenancy.status === "active"
    ? t("tenants.statusActive")
    : tenancy.status === "ending_tenancy"
      ? t("tenants.statusEndingTenancy")
      : t("tenants.statusHistoric");

  const statusVariant = tenancy.status === "active"
    ? "success"
    : tenancy.status === "ending_tenancy"
      ? "warning"
      : "secondary" as const;

  const tenantName = tenancy.tenantFirstName
    ? `${tenancy.tenantFirstName} ${tenancy.tenantLastName || ""}`.trim()
    : null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/[0.03] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {tenantName || "—"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {tenancy.tenantEmail || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {tenancy.startDate ? formatDate(tenancy.startDate) : "—"}
        </div>
        <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0">
          {statusLabel}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigate(`/properties/${tenancy.propertyId}/tenants?tab=contracts`)}
          aria-label={t("common.view")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function Tenants() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ["tenancies-by-manager", userId],
    queryFn: () => tenantService.getTenanciesByManager(userId!),
    enabled: !!userId,
  });

  const groupedByProperty = tenancies?.reduce<Record<string, { title: string; items: TenancyDomain[] }>>((acc, t) => {
    if (!acc[t.propertyId]) {
      acc[t.propertyId] = { title: t.propertyTitle, items: [] };
    }
    acc[t.propertyId].items.push(t);
    return acc;
  }, {});

  const propertyEntries = groupedByProperty ? Object.entries(groupedByProperty) : [];

  const totalTenantCount = tenancies?.filter(t => t.tenantId).length || 0;
  const totalTenancyCount = tenancies?.length || 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              {t("tenants.pageTitle")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalTenancyCount > 0
                ? t("tenants.tenantCount").replace("{count}", String(totalTenantCount))
                : t("tenants.pageDescription")}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : propertyEntries.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("tenants.noTenants")}
          description={t("tenants.noTenantsDesc")}
          action={
            <Button onClick={() => navigate("/properties")}>
              <Building className="mr-2 h-4 w-4" />
              {t("properties.title")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {propertyEntries.map(([propertyId, group]) => (
            <Card key={propertyId}>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{group.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {group.items.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => navigate(`/properties/${propertyId}/tenants?tab=contracts`)}
                    aria-label={t("common.view")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((tenancy) => (
                  <TenancyRow key={tenancy.id} tenancy={tenancy} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
