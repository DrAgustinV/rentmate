import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Building, Search, Plus } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { OccupancyBadge } from "@/components/ui/status-badges";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { tenantService } from "@/services/tenantService";
import { authService } from "@/services";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import type { TenancyDomain } from "@/types/domain";

export default function Tenants() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [tenancyView, setTenancyView] = useState<"active" | "ending" | "historic">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const debouncedSearch = useDebounce(searchTerm, 300);

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

  const filteredTenancies = useMemo(() => {
    if (!tenancies) return [];
    let filtered = tenancies;

    if (tenancyView === "active") {
      filtered = filtered.filter(t => t.status === "active");
    } else if (tenancyView === "ending") {
      filtered = filtered.filter(t => t.status === "ending_tenancy");
    } else {
      filtered = filtered.filter(t => t.status === "historic");
    }

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(t =>
        t.propertyTitle.toLowerCase().includes(lower) ||
        (t.tenantFirstName || "").toLowerCase().includes(lower) ||
        (t.tenantLastName || "").toLowerCase().includes(lower) ||
        t.tenantEmail.toLowerCase().includes(lower)
      );
    }

    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return (a.tenantFirstName || "").localeCompare(b.tenantFirstName || "");
      }
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [tenancies, tenancyView, debouncedSearch, sortBy]);

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

      <div className="mb-6">
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy === "name" ? "alphabetical" : "newest"}
          onSortChange={(val) => setSortBy(val === "alphabetical" ? "name" : "date")}
          pills={
            <div className="bg-muted rounded-lg p-1 flex gap-1">
              {[
                { value: "active" as const, label: t("tenants.statusActive") },
                { value: "ending" as const, label: t("tenants.statusEndingTenancy") },
                { value: "historic" as const, label: t("tenants.statusHistoric") },
              ].map((pill) => (
                <Button
                  key={pill.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 h-auto rounded-md",
                    tenancyView === pill.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setTenancyView(pill.value)}
                >
                  {pill.label}
                </Button>
              ))}
            </div>
          }
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton preset="page" />
      ) : filteredTenancies.length === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={Search}
            title={t("properties.noResults")}
            description={t("properties.noResultsDesc")}
          />
        ) : tenancyView === "active" ? (
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
        ) : tenancyView === "ending" ? (
          <EmptyState
            icon={Building}
            title={t("properties.endingTenancy.emptyTitle")}
            description={t("properties.endingTenancy.emptyDesc")}
          />
        ) : (
          <EmptyState
            icon={Building}
            title={t("historicTenancies.noHistoricTenancies")}
            description={t("historicTenancies.noHistoricTenanciesDesc")}
          />
        )
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tenants.property")}</TableHead>
                <TableHead>{t("tenants.status")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("tenants.tenantColumn")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("properties.period")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenancies.map((tenancy) => {
                const status: "Active" | "Ending" | "Historic" =
                  tenancy.status === "active" ? "Active"
                  : tenancy.status === "ending_tenancy" ? "Ending"
                  : "Historic";

                const tenantName = tenancy.tenantFirstName
                  ? `${tenancy.tenantFirstName} ${tenancy.tenantLastName || ""}`.trim()
                  : tenancy.managerTenantName
                    ? t("tenancy.selfManaged")
                    : "—";

                return (
                  <TableRow
                    key={tenancy.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/properties/${tenancy.propertyId}/tenants?tab=contracts`)}
                  >
                    <TableCell className="font-medium hover:text-primary">
                      <div>{tenancy.propertyTitle}</div>
                      {tenancy.propertyAddress && (
                        <div className="text-xs text-muted-foreground">
                          {tenancy.propertyAddress}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <OccupancyBadge status={status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {tenantName}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="tabular-nums leading-tight">
                        <div>{formatDate(tenancy.startDate)}</div>
                        <div className="text-muted-foreground">
                          {tenancy.endDate ? formatDate(tenancy.endDate) : t("tenancy.ongoing")}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
