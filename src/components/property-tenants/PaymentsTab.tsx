import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Clock, Bell, BellOff, Coins } from "lucide-react";
import { UnifiedPaymentHistory, UnifiedPayment } from "@/components/payments/UnifiedPaymentHistory";
import { CreatePaymentDialog } from "@/components/CreatePaymentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { useTenancyStarted } from "@/hooks/useTenancyStarted";
import { useRentPayments } from "@/hooks/useRentPayments";
import { useUtilityPayments } from "@/hooks/useUtilityPayments";
import { tenancyService } from "@/services";
import { showToast } from "@/lib/toast";
import { isWithinInterval, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface AgreementRow {
  id: string;
  tenancy_id: string;
  is_active: boolean;
  auto_reminders_enabled: boolean | null;
}

interface PaymentsTabProps {
  currentTenant: {
    id: string;
    tenant_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    tenancy_status: string;
  } | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
}

type TypeFilter = "all" | "rent" | "utility";
type StatusFilter = "all" | "paid" | "pending" | "overdue";
type PeriodFilter = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "all_time";

const ITEMS_PER_PAGE = 10;

export function PaymentsTab({ currentTenant, propertyId, userRole }: PaymentsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all_time");

  const { isStarted, formattedStartDate } = useTenancyStarted(propertyId, currentTenant?.id);

  const { data: rentPayments, isLoading: rentLoading } = useRentPayments(propertyId);
  const { data: utilityPayments, isLoading: utilityLoading } = useUtilityPayments(propertyId);
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);

  const isLoading = rentLoading || utilityLoading || agreementsLoading;

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
    if (!currentTenant?.tenant_id) return [];

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
      .filter(p => p.tenant_id === currentTenant.tenant_id)
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
      .filter(p => p.tenant_id === currentTenant.tenant_id)
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
        return true;
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [rentPayments, utilityPayments, currentTenant, typeFilter, statusFilter, periodFilter]);

  const totalPages = Math.ceil(allPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = allPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, periodFilter]);

  const currentAgreement = rentAgreements?.find(
    (ra: AgreementRow) => ra.tenancy_id === currentTenant?.id && ra.is_active
  );

  if (!currentTenant) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">{t("payments.noPayments")}</p>
        <p className="text-sm">{t("payments.noPaymentsDesc")}</p>
      </div>
    );
  }

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
        </div>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("payments.createPayment")}
        </Button>
      </div>

      {isManager && currentAgreement && (
        <div className="flex items-center justify-end">
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
        </div>
      )}

      <Card className="card-shine">
        <CardHeader>
          <CardTitle>{t("payments.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedPaymentHistory
            propertyId={propertyId}
            isManager={isManager}
            payments={paginatedPayments}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            hasPayments={allPayments.length > 0}
            noAgreements={!rentAgreements || rentAgreements.length === 0}
          />
        </CardContent>
      </Card>

      {managerId && (
        <CreatePaymentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          propertyId={propertyId}
          tenantId={currentTenant.tenant_id}
          managerId={managerId}
          isManager={isManager}
        />
      )}
    </div>
  );
}
