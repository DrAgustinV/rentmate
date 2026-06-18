import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Clock, Bell, BellOff, History } from "lucide-react";
import { UnifiedPaymentHistory, UnifiedPayment } from "@/components/payments/UnifiedPaymentHistory";
import { CreatePaymentDialog } from "@/components/CreatePaymentDialog";
import { BackfillPaymentsWizard } from "@/components/payments/BackfillPaymentsWizard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { useTenancyStarted } from "@/hooks/useTenancyStarted";
import { useRentPayments } from "@/hooks/useRentPayments";
import { useUtilityPayments } from "@/hooks/useUtilityPayments";
import { useBackfillPayments } from "@/hooks/useBackfillPayments";
import { tenancyService } from "@/services";
import { showToast } from "@/lib/toast";
import { filterTenantsByPill, type TenantFilter } from "@/lib/tenantFilterUtils";
import { isWithinInterval, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface AgreementRow {
  id: string;
  tenancy_id: string;
  is_active: boolean;
  auto_reminders_enabled: boolean | null;
  rent_amount_cents: number;
}

interface PaymentsTabProps {
  currentTenant: {
    id: string;
    tenant_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    tenancy_status: string;
    started_at?: string;
  } | null;
  allTenants?: Array<{
    id: string;
    tenant_id: string;
    tenancy_status: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }> | null;
  tenantFilter?: TenantFilter;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
  requirementsRentAmountCents?: number | null;
}

type TypeFilter = "all" | "rent" | "utility";
type StatusFilter = "all" | "paid" | "pending" | "overdue";
type PeriodFilter = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "all_time";

const ITEMS_PER_PAGE = 10;

export function PaymentsTab({ currentTenant, allTenants, tenantFilter, propertyId, userRole, requirementsRentAmountCents }: PaymentsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backfillDialogOpen, setBackfillDialogOpen] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all_time");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [historicTenantId, setHistoricTenantId] = useState<string | null>(null);
  const effectiveTenantFilter = tenantFilter || "current";

  const { isStarted, formattedStartDate } = useTenancyStarted(propertyId, currentTenant?.id);
  const { gapAnalysis } = useBackfillPayments(propertyId, currentTenant?.id ?? "", currentTenant?.tenant_id, {
    fallbackStartDate: currentTenant?.started_at ? new Date(currentTenant.started_at) : null,
    fallbackRentAmountCents: requirementsRentAmountCents,
  });

  const { data: rentPayments, isLoading: rentLoading } = useRentPayments(propertyId);
  const { data: utilityPayments, isLoading: utilityLoading } = useUtilityPayments(propertyId);
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);

  const isLoading = rentLoading || utilityLoading || agreementsLoading;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    [...(rentPayments || []), ...(utilityPayments || [])].forEach(p => {
      years.add(new Date(p.payment_due_date).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [rentPayments, utilityPayments]);

  useEffect(() => {
    tenancyService.getPropertyManagerId(propertyId).then(setManagerId);
  }, [propertyId]);

  const toggleRemindersMutation = useMutation({
    mutationFn: async ({ agreementId, enabled }: { agreementId: string; enabled: boolean }) => {
      await tenancyService.updateRentAgreementSimple(agreementId, { auto_reminders_enabled: enabled } as never);
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["rent-agreements", propertyId] });
      showToast.success(enabled ? t("payments.remindersEnabled") : t("payments.remindersDisabled"));
    },
    onError: (error: Error) => {
      showToast.error(error.message);
    },
  });

  const allPayments: UnifiedPayment[] = useMemo(() => {
    if (!rentPayments || !utilityPayments) return [];

    let tenantIdsToInclude: string[] | null = null;

    if (allTenants && effectiveTenantFilter) {
      const filtered = filterTenantsByPill(allTenants, effectiveTenantFilter);
      if (effectiveTenantFilter === "historic" && historicTenantId) {
        const t = filtered.find(t => t.id === historicTenantId);
        tenantIdsToInclude = t ? [t.tenant_id] : [];
      } else {
        tenantIdsToInclude = filtered.map(t => t.tenant_id).filter(Boolean);
      }
      if (tenantIdsToInclude.length === 0) {
        if (filtered.length > 0) {
          tenantIdsToInclude = null;
        } else {
          return [];
        }
      }
    } else if (currentTenant) {
      tenantIdsToInclude = currentTenant.tenant_id ? [currentTenant.tenant_id] : null;
    } else {
      return [];
    }

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

    const rent: UnifiedPayment[] = (rentPayments || [])
      .filter(p => !tenantIdsToInclude || tenantIdsToInclude.includes(p.tenant_id))
      .map(p => ({
        id: p.id,
        type: "rent" as const,
        dueDate: p.payment_due_date,
        amountCents: p.amount_cents,
        currency: p.currency,
        status: p.status as "pending" | "paid" | "overdue",
        proofOfPaymentUrl: p.proof_of_payment_url,
        proofReviewStatus: p.proof_review_status,
        data: p,
      }));

    const utility: UnifiedPayment[] = (utilityPayments || [])
      .filter(p => !tenantIdsToInclude || tenantIdsToInclude.includes(p.tenant_id))
      .map(p => ({
        id: p.id,
        type: "utility" as const,
        dueDate: p.payment_due_date,
        amountCents: p.amount_cents,
        currency: p.currency,
        status: p.status as "pending" | "paid" | "overdue",
        proofOfPaymentUrl: p.proof_of_payment_url,
        proofReviewStatus: p.proof_review_status,
        data: p,
      }));

    return [...rent, ...utility]
      .filter(p => {
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (periodStart) {
          const dueDate = new Date(p.dueDate);
          if (!isWithinInterval(dueDate, { start: periodStart, end: endOfMonth(now) })) return false;
        }
        if (yearFilter !== "all") {
          const paymentYear = new Date(p.dueDate).getFullYear().toString();
          if (paymentYear !== yearFilter) return false;
        }
        if (amountMin !== "" && p.amountCents < parseFloat(amountMin) * 100) return false;
        if (amountMax !== "" && p.amountCents > parseFloat(amountMax) * 100) return false;
        return true;
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [rentPayments, utilityPayments, allTenants, effectiveTenantFilter, historicTenantId, currentTenant, typeFilter, statusFilter, periodFilter, yearFilter, amountMin, amountMax]);

  const totalPages = Math.ceil(allPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = allPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, periodFilter, yearFilter, amountMin, amountMax]);

  useEffect(() => {
    setHistoricTenantId(null);
  }, [tenantFilter]);

  const currentAgreement = rentAgreements?.find(
    (ra: AgreementRow) => ra.tenancy_id === currentTenant?.id && ra.is_active
  );

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
      {!isStarted && formattedStartDate && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{t("payments.availableAfterStart")} {formattedStartDate}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={(v: TypeFilter) => setTypeFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("payments.filters.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("payments.filters.all")}</SelectItem>
              <SelectItem value="rent">{t("payments.filters.rent")}</SelectItem>
              <SelectItem value="utility">{t("payments.filters.utility")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("payments.filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("payments.filters.allStatuses")}</SelectItem>
              <SelectItem value="paid">{t("payments.filters.paidStatus")}</SelectItem>
              <SelectItem value="pending">{t("payments.filters.pending")}</SelectItem>
              <SelectItem value="overdue">{t("payments.filters.overdue")}</SelectItem>
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
              className="w-[100px] h-9"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="number"
              placeholder={t("payments.filters.max")}
              className="w-[100px] h-9"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isManager && currentAgreement && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {currentAgreement.auto_reminders_enabled !== false ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={currentAgreement.auto_reminders_enabled !== false}
                      onCheckedChange={(checked) =>
                        toggleRemindersMutation.mutate({ agreementId: currentAgreement.id, enabled: checked })
                      }
                      disabled={toggleRemindersMutation.isPending}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("payments.autoReminders")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" onClick={() => setBackfillDialogOpen(true)} disabled={!gapAnalysis?.hasGap}>
            <History className="h-4 w-4 mr-2" />
            {t("payments.backfill.button")}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("payments.createPayment")}
          </Button>
        </div>
      </div>

      {allTenants && effectiveTenantFilter === "historic" && allTenants.filter(t => t.tenancy_status === "historic").length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={historicTenantId || "__all__"} onValueChange={(v) => setHistoricTenantId(v === "__all__" ? null : v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("common.all")} ({t("propertyHub.filter.historic").toLowerCase()})
              </SelectItem>
              {allTenants.filter(t => t.tenancy_status === "historic").map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.first_name || t.last_name ? `${t.first_name || ""} ${t.last_name || ""}`.trim() : t.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="card-shine">
        {/* <CardHeader>
          <CardTitle>{t("payments.title")}</CardTitle>
        </CardHeader> */}
        <CardContent>
          <UnifiedPaymentHistory
            propertyId={propertyId}
            isManager={isManager}
            payments={paginatedPayments}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            hasTenant={!!currentTenant}
            hasPayments={allPayments.length > 0}
            noAgreements={!rentAgreements || rentAgreements.length === 0}
          />
        </CardContent>
      </Card>

      {managerId && currentTenant && (
        <CreatePaymentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          propertyId={propertyId}
          tenancyId={currentTenant.id}
          fallbackAmountCents={requirementsRentAmountCents}
        />
      )}

      {managerId && currentTenant && (
        <BackfillPaymentsWizard
          open={backfillDialogOpen}
          onOpenChange={setBackfillDialogOpen}
          propertyId={propertyId}
          tenancyId={currentTenant.id}
          tenantProfileId={currentTenant.tenant_id}
        />
      )}
    </div>
  );
}
