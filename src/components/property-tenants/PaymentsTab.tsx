import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Bell, BellOff } from "lucide-react";
import { UnifiedPaymentHistory } from "@/components/payments/UnifiedPaymentHistory";
import { CreatePaymentDialog } from "@/components/CreatePaymentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { useTenancyStarted } from "@/hooks/useTenancyStarted";
import { useRentPayments } from "@/hooks/useRentPayments";
import { useUtilityPayments } from "@/hooks/useUtilityPayments";
import { UnifiedPayment } from "@/components/payments/UnifiedPaymentHistory";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { showToast } from "@/lib/toast";
import { format, isWithinInterval, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  started_at: string;
  ended_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
}

interface PaymentsTabProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
}

type TypeFilter = "all" | "rent" | "utility";
type StatusFilter = "all" | "paid" | "pending" | "overdue";
type PeriodFilter = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "all_time";

const ITEMS_PER_PAGE = 10;

export function PaymentsTab({
  currentTenant,
  propertyId,
  userRole,
}: PaymentsTabProps) {
  const { t } = useLanguage();
  const isManager = userRole?.isManager || false;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [managerId, setManagerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Filter state
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all_time");
  const [currentPage, setCurrentPage] = useState(1);

  // Check if tenancy has started
  const { isStarted, formattedStartDate } = useTenancyStarted(propertyId, currentTenant?.id);

  // Lazy-loaded queries
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);
  const { data: rentPayments } = useRentPayments(propertyId);
  const { data: utilityPayments } = useUtilityPayments(propertyId);

  // Fetch manager ID for the property
  useEffect(() => {
    const fetchManagerId = async () => {
      const { data } = await supabase
        .from('properties')
        .select('manager_id')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        setManagerId(data.manager_id);
      }
    };
    fetchManagerId();
  }, [propertyId]);

  // Mutation to toggle auto reminders
  const toggleRemindersMutation = useMutation({
    mutationFn: async ({ agreementId, enabled }: { agreementId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('rent_agreements')
        .update({ auto_reminders_enabled: enabled })
        .eq('id', agreementId);
      
      if (error) throw error;
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['rent-agreements', propertyId] });
      showToast.success({ title: enabled ? t("payments.remindersEnabled") : t("payments.remindersDisabled") });
    },
    onError: (error: any) => {
      showToast.error({ title: error.message });
    },
  });

  // Combine and filter payments
  const allPayments = useMemo(() => {
    if (!rentPayments || !utilityPayments) return [];

    const now = new Date();
    let periodStart: Date | null = null;

    switch (periodFilter) {
      case 'this_month':
        periodStart = startOfMonth(now);
        break;
      case 'last_month':
        periodStart = startOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        periodStart = subMonths(now, 3);
        break;
      case 'last_6_months':
        periodStart = subMonths(now, 6);
        break;
      case 'all_time':
      default:
        periodStart = null;
    }

    const rent: UnifiedPayment[] = (rentPayments || []).map((p) => ({
      id: p.id,
      type: 'rent' as const,
      dueDate: p.payment_due_date,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status as 'pending' | 'paid' | 'overdue',
      proofOfPaymentUrl: p.proof_of_payment_url,
      proofReviewStatus: p.proof_review_status,
      data: p,
    }));

    const utility: UnifiedPayment[] = (utilityPayments || []).map((p) => ({
      id: p.id,
      type: 'utility' as const,
      dueDate: p.payment_due_date,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status as 'pending' | 'paid' | 'overdue',
      proofOfPaymentUrl: p.proof_of_payment_url,
      proofReviewStatus: p.proof_review_status,
      data: p,
    }));

    return [...rent, ...utility]
      .filter(p => {
        // Type filter
        if (typeFilter !== 'all' && p.type !== typeFilter) return false;
        
        // Status filter
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        
        // Period filter
        if (periodStart) {
          const dueDate = new Date(p.dueDate);
          if (!isWithinInterval(dueDate, { start: periodStart, end: endOfMonth(now) })) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [rentPayments, utilityPayments, typeFilter, statusFilter, periodFilter]);

  // Paginated payments
  const totalPages = Math.ceil(allPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = allPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, periodFilter]);

  // Show for both managers and tenants
  if (!currentTenant) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t("dialogs.manageTenants.noTenants")}</p>
        <p className="text-sm mt-2">{t("properties.inviteTenantToGetStarted")}</p>
      </div>
    );
  }

  const currentAgreement = rentAgreements?.find(ra => ra.tenancy_id === currentTenant.id && ra.is_active);
  const isSelfManaged = currentTenant && !currentTenant.tenant_id;

  return (
    <div className="space-y-6">
      {/* Notice when tenancy hasn't started */}
      {!isStarted && formattedStartDate && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{t("payments.availableAfterStart")} {formattedStartDate}</span>
        </div>
      )}

      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
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

          {/* Status filter */}
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

          {/* Period filter */}
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

        {/* Create Payment Button */}
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("payments.createPayment")}
        </Button>
      </div>

      {/* Auto Reminders Toggle - Manager Only */}
      {isManager && currentAgreement && (
        <div className="flex items-center justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  {(currentAgreement as any).auto_reminders_enabled !== false ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={(currentAgreement as any).auto_reminders_enabled !== false}
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

      {/* Payments Card */}
      <Card className="card-shine">
        <CardHeader>
          <CardTitle>{t("payments.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {agreementsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Create Payment Dialog */}
      {managerId && (
        <CreatePaymentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          propertyId={propertyId}
          tenantId={isSelfManaged ? undefined : currentTenant.tenant_id}
          managerId={managerId}
          isManager={isManager}
        />
      )}
    </div>
  );
}
