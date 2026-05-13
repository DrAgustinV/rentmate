import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, subYears, startOfYear, endOfYear } from "date-fns";
import { Search, History, Eye } from "lucide-react";
import { HistoricTenancyDetails } from "./HistoricTenancyDetails";

interface HistoricTabProps {
  propertyId: string;
  isManager: boolean;
}

type SortOption = "newest" | "oldest" | "end_date";
type PeriodOption = "this_year" | "last_year" | "last_2_years" | "all_time";

const ITEMS_PER_PAGE = 10;

interface HistoricTenancy {
  id: string;
  tenant_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  started_at: string;
  ended_at: string | null;
  tenancy_status: string;
}

export function HistoricTab({ propertyId, isManager }: HistoricTabProps) {
  const { t } = useLanguage();
  const [searchFilter, setSearchFilter] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [periodOption, setPeriodOption] = useState<PeriodOption>("all_time");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTenancy, setSelectedTenancy] = useState<HistoricTenancy | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['historic-tenants', propertyId],
    queryFn: async () => {
      // Fetch historic property_tenants
      const { data: historicTenants, error } = await supabase
        .from('property_tenants')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenancy_status', 'historic')
        .order('ended_at', { ascending: false });

      if (error) throw error;
      if (!historicTenants || historicTenants.length === 0) return [];

      // Get unique tenant IDs
      const tenantIds = [...new Set(historicTenants.map(t => t.tenant_id).filter(Boolean))];
      
      // Fetch tenant details (email, name)
      let tenantDetails: Record<string, { email: string; first_name: string | null; last_name: string | null }> = {};
      
      if (tenantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('tenants')
          .select('id, email, first_name, last_name')
          .in('id', tenantIds);
        
        if (profiles) {
          profiles.forEach(p => {
            tenantDetails[p.id] = {
              email: p.email,
              first_name: p.first_name,
              last_name: p.last_name
            };
          });
        }
      }

      // Merge data
      return historicTenants.map(t => ({
        ...t,
        email: t.tenant_id ? tenantDetails[t.tenant_id]?.email || '' : '',
        first_name: t.tenant_id ? tenantDetails[t.tenant_id]?.first_name : null,
        last_name: t.tenant_id ? tenantDetails[t.tenant_id]?.last_name : null,
      })) as HistoricTenancy[];
    },
  });

  // Filter and sort tenancies
  const filteredTenancies = useMemo(() => {
    if (!tenants) return [];

    const now = new Date();
    let periodStart: Date | null = null;

    switch (periodOption) {
      case 'this_year':
        periodStart = startOfYear(now);
        break;
      case 'last_year':
        periodStart = startOfYear(subYears(now, 1));
        break;
      case 'last_2_years':
        periodStart = subYears(now, 2);
        break;
      case 'all_time':
      default:
        periodStart = null;
    }

    return tenants
      .filter(tenant => {
        // Search filter
        const searchLower = searchFilter.toLowerCase();
        const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase();
        const matchesSearch = !searchFilter || 
          fullName.includes(searchLower) || 
          tenant.email.toLowerCase().includes(searchLower);

        // Period filter
        let matchesPeriod = true;
        if (periodStart && tenant.ended_at) {
          const endDate = new Date(tenant.ended_at);
          matchesPeriod = isWithinInterval(endDate, { start: periodStart, end: endOfYear(now) });
        }

        return matchesSearch && matchesPeriod;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
          case 'oldest':
            return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          case 'end_date':
            return new Date(b.ended_at || 0).getTime() - new Date(a.ended_at || 0).getTime();
          default:
            return 0;
        }
      });
  }, [tenants, searchFilter, sortOption, periodOption]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, sortOption, periodOption]);

  const totalPages = Math.ceil(filteredTenancies.length / ITEMS_PER_PAGE);
  const paginatedTenancies = filteredTenancies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = (tenancy: HistoricTenancy) => {
    setSelectedTenancy(tenancy);
    setDetailsOpen(true);
  };

  const getTenantName = (tenant: HistoricTenancy) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("historicTenancies.searchPlaceholder")}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>

          {/* Sort */}
          <Select value={sortOption} onValueChange={(v: SortOption) => setSortOption(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("historicTenancies.sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("historicTenancies.sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("historicTenancies.sortOldest")}</SelectItem>
              <SelectItem value="end_date">{t("historicTenancies.sortByEndDate")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Period */}
          <Select value={periodOption} onValueChange={(v: PeriodOption) => setPeriodOption(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("historicTenancies.period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_year">{t("historicTenancies.thisYear")}</SelectItem>
              <SelectItem value="last_year">{t("historicTenancies.lastYear")}</SelectItem>
              <SelectItem value="last_2_years">{t("historicTenancies.last2Years")}</SelectItem>
              <SelectItem value="all_time">{t("historicTenancies.allTime")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filteredTenancies.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">{t("historicTenancies.noHistoricTenancies")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("historicTenancies.noHistoricTenanciesDesc")}</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.tenant")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("historicTenancies.details.startDate")}</TableHead>
                  <TableHead>{t("historicTenancies.details.endDate")}</TableHead>
                  <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTenancies.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{getTenantName(tenant)}</div>
                        <div className="text-xs text-muted-foreground">{tenant.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-muted-foreground">
                        {t("propertyTenancies.tabs.historic")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.started_at ? format(new Date(tenant.started_at), 'PP') : '-'}
                    </TableCell>
                    <TableCell>
                      {tenant.ended_at ? format(new Date(tenant.ended_at), 'PP') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(tenant)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("historicTenancies.viewDetails")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm text-muted-foreground px-2">
                    {currentPage} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Details Dialog */}
      {selectedTenancy && (
        <HistoricTenancyDetails
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          tenancy={selectedTenancy}
          propertyId={propertyId}
        />
      )}
    </div>
  );
}

export default HistoricTab;