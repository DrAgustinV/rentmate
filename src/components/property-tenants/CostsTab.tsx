import { useState, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Wallet, Receipt, AlertCircle, History } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePropertyCosts, usePropertyCostMutations } from "@/hooks/usePropertyCosts";
import { CostDialog } from "@/components/property-tenants/CostDialog";
import { BackfillCostsWizard } from "@/components/property-tenants/BackfillCostsWizard";
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { PropertyCostDomain, CostCategory } from "@/types/domain";
import type { CreateCostInput, UpdateCostInput } from "@/services/costService";

const ITEMS_PER_PAGE = 10;

type CategoryFilter = "all" | CostCategory;
type StatusFilter = "all" | "pending" | "paid";
type PeriodFilter = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "all_time";

interface CostsTabProps {
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
}

const categoryLabels: Record<string, string> = {
  community_fee: "costs.filters.community_fee",
  property_tax: "costs.filters.property_tax",
  maintenance: "costs.filters.maintenance",
  exceptional: "costs.filters.exceptional",
  insurance: "costs.filters.insurance",
  other: "costs.filters.other",
};

const recurrenceLabels: Record<string, string> = {
  once: "costs.fields.once",
  monthly: "costs.fields.monthly",
  quarterly: "costs.fields.quarterly",
  yearly: "costs.fields.yearly",
};

export function CostsTab({ propertyId, userRole }: CostsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<PropertyCostDomain | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all_time");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");

  const { data: costs, isLoading } = usePropertyCosts(propertyId);
  const { createCost, updateCost, deleteCost } = usePropertyCostMutations(propertyId);

  const [backfillDialogOpen, setBackfillDialogOpen] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (costs || []).forEach(c => {
      const date = c.dueDate || c.createdAt;
      years.add(new Date(date).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [costs]);

  const filteredCosts: PropertyCostDomain[] = useMemo(() => {
    if (!costs) return [];

    const now = new Date();
    let periodStart: Date | null = null;
    switch (periodFilter) {
      case "this_month":
        periodStart = startOfMonth(now);
        break;
      case "last_month":
        periodStart = startOfMonth(subMonths(now, 1));
        break;
      case "last_3_months":
        periodStart = subMonths(now, 3);
        break;
      case "last_6_months":
        periodStart = subMonths(now, 6);
        break;
      case "all_time":
        periodStart = null;
    }

    return costs.filter(c => {
      if (categoryFilter !== "all" && c.costCategory !== categoryFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (periodStart) {
        const date = c.dueDate ? new Date(c.dueDate) : new Date(c.createdAt);
        if (!isWithinInterval(date, { start: periodStart, end: endOfMonth(now) })) return false;
      }
      if (yearFilter !== "all") {
        const year = c.dueDate ? new Date(c.dueDate).getFullYear().toString() : new Date(c.createdAt).getFullYear().toString();
        if (year !== yearFilter) return false;
      }
      if (amountMin !== "" && c.amountCents < parseFloat(amountMin) * 100) return false;
      if (amountMax !== "" && c.amountCents > parseFloat(amountMax) * 100) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.dueDate || a.createdAt;
      const dateB = b.dueDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [costs, categoryFilter, statusFilter, periodFilter, yearFilter, amountMin, amountMax]);

  const totalPages = Math.ceil(filteredCosts.length / ITEMS_PER_PAGE);
  const paginatedCosts = filteredCosts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, periodFilter, yearFilter, amountMin, amountMax]);

  const handleSave = async (input: CreateCostInput | UpdateCostInput) => {
    if (editingCost) {
      await updateCost.mutateAsync({ id: editingCost.id, updates: input as UpdateCostInput });
    } else {
      await createCost.mutateAsync(input as CreateCostInput);
    }
    setDialogOpen(false);
    setEditingCost(null);
  };

  const handleEdit = (cost: PropertyCostDomain) => {
    setEditingCost(cost);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteCost.mutateAsync(id);
  };

  const isSubmitting = createCost.isPending || updateCost.isPending;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "MMM d, yyyy");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[120px]" />
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={(v: CategoryFilter) => setCategoryFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("costs.filters.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("costs.filters.allCategories")}</SelectItem>
              {costCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`costs.filters.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("costs.filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("costs.filters.allStatuses")}</SelectItem>
              <SelectItem value="pending">{t("costs.filters.pending")}</SelectItem>
              <SelectItem value="paid">{t("costs.filters.paid")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(v: PeriodFilter) => setPeriodFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("payments.filters.allTime")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">{t("payments.filters.thisMonth")}</SelectItem>
              <SelectItem value="last_month">{t("payments.filters.lastMonth")}</SelectItem>
              <SelectItem value="last_3_months">{t("payments.filters.last3Months")}</SelectItem>
              <SelectItem value="last_6_months">{t("payments.filters.last6Months")}</SelectItem>
              <SelectItem value="all_time">{t("payments.filters.allTime")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder={t("payments.filters.allYears")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("payments.filters.allYears")}</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder={t("payments.filters.min")}
              className="w-[70px] h-9"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              placeholder={t("payments.filters.max")}
              className="w-[70px] h-9"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <Button variant="outline" onClick={() => setBackfillDialogOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              {t("costs.backfill.button")}
            </Button>
          )}
          {isManager && (
            <Button onClick={() => { setEditingCost(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("costs.createCost")}
            </Button>
          )}
        </div>
      </div>

      <Card className="card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            {t("costs.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            !costs || costs.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={t("costs.emptyStates.noCosts")}
                description={t("costs.emptyStates.noCostsDesc")}
                size="compact"
              />
            ) : (
              <EmptyState
                icon={AlertCircle}
                title={t("costs.emptyStates.noResults")}
                size="compact"
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left font-medium pb-3 pr-4">{t("costs.fields.category")}</th>
                    <th className="text-left font-medium pb-3 pr-4">{t("costs.fields.description")}</th>
                    <th className="text-right font-medium pb-3 pr-4">{t("costs.fields.amount")}</th>
                    <th className="text-left font-medium pb-3 pr-4">{t("costs.fields.dueDate")}</th>
                    <th className="text-center font-medium pb-3 pr-4">{t("costs.fields.status")}</th>
                    <th className="text-center font-medium pb-3 pr-4">{t("costs.fields.recurrence")}</th>
                    {isManager && <th className="text-right font-medium pb-3">{t("common.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCosts.map((cost) => (
                    <tr key={cost.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary/40" />
                          {t(categoryLabels[cost.costCategory] || cost.costCategory)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">
                        {cost.description || "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">
                        {formatCurrency(cost.amountCents)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {cost.dueDate ? formatDate(cost.dueDate) : "—"}
                        {cost.paidDate && (
                          <span className="block text-xs text-success">
                            {t("costs.fields.paidDate")}: {formatDate(cost.paidDate)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge variant={cost.status === "paid" ? "secondary" : "outline"}>
                          {cost.status === "paid" ? t("costs.filters.paid") : t("costs.filters.pending")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-center text-muted-foreground text-xs">
                        {t(recurrenceLabels[cost.recurrence] || cost.recurrence)}
                      </td>
                      {isManager && (
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cost)}>
                              {t("common.edit")}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cost.id)}>
                              {t("common.delete")}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      <CostDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCost(null);
        }}
        propertyId={propertyId}
        cost={editingCost}
        onSave={handleSave}
        isSubmitting={isSubmitting}
      />

      <BackfillCostsWizard
        open={backfillDialogOpen}
        onOpenChange={setBackfillDialogOpen}
        propertyId={propertyId}
      />
    </div>
  );
}

const costCategories: CostCategory[] = ['community_fee', 'property_tax', 'maintenance', 'exceptional', 'insurance', 'other'];
