import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentPayments, RentPayment } from "@/hooks/useRentPayments";
import { tenancyService } from "@/services";
import { showToast } from "@/lib/toast";
import { format } from "date-fns";
import { Coins, Calendar, Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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

const ITEMS_PER_PAGE = 10;

interface RentAgreement {
  id: string;
  auto_reminders_enabled: boolean | null;
}

export function PaymentsTab({ currentTenant, propertyId, userRole }: PaymentsTabProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: payments, isLoading } = useRentPayments(propertyId);

  const { data: rentAgreements } = useQuery({
    queryKey: ["rent-agreements", propertyId],
    queryFn: async () => {
      if (!currentTenant?.tenant_id) return [];
      const data = await tenancyService.getRentAgreementsForProperty(propertyId);
      return data.filter((a: RentAgreement) => a.tenant_id === currentTenant.tenant_id);
    },
    enabled: !!currentTenant?.tenant_id,
  });

  const activeAgreement = rentAgreements?.find((a: RentAgreement) => a.is_active);

  const toggleRemindersMutation = useMutation({
    mutationFn: async ({ agreementId, enabled }: { agreementId: string; enabled: boolean }) => {
      await tenancyService.updateRentAgreementSimple(agreementId, { auto_reminders_enabled: enabled });
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["rent-agreements", propertyId] });
      showToast.success({
        title: enabled ? t("payments.remindersEnabled") : t("payments.remindersDisabled")
      });
    },
    onError: (error: any) => {
      showToast.error({ title: error.message });
    },
  });

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!currentTenant?.tenant_id) return [];
    return payments.filter((p: RentPayment) => p.tenant_id === currentTenant.tenant_id);
  }, [payments, currentTenant]);

  const paginatedPayments = useMemo(() =>
    filteredPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredPayments, currentPage]
  );

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>;
      case "pending":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-500 hover:bg-red-600">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
      {userRole?.isManager && activeAgreement && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-reminders" className="text-sm font-medium">
                {t("payments.autoReminders")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("payments.autoRemindersDesc")}
              </p>
            </div>
          </div>
          <Switch
            id="auto-reminders"
            checked={activeAgreement.auto_reminders_enabled ?? false}
            onCheckedChange={(enabled) =>
              toggleRemindersMutation.mutate({
                agreementId: activeAgreement.id,
                enabled,
              })
            }
            disabled={toggleRemindersMutation.isPending}
          />
        </div>
      )}

      {filteredPayments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{t("payments.noPayments")}</p>
          <p className="text-sm">{t("payments.noPaymentsDesc")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("payments.status")}</TableHead>
                  <TableHead>{t("payments.amount")}</TableHead>
                  <TableHead>{t("payments.dueDate")}</TableHead>
                  <TableHead>{t("payments.paidDate")}</TableHead>
                  <TableHead>{t("payments.method")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((payment: RentPayment) => {
                  const isOverdue =
                    payment.status === "pending" &&
                    new Date(payment.payment_due_date) < new Date();

                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {isOverdue ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Overdue</span>
                          </div>
                        ) : (
                          getStatusBadge(payment.status)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t("payments.currency")} {(payment.amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(payment.payment_due_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.payment_received_date ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {format(new Date(payment.payment_received_date), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <span className="capitalize">{payment.payment_method}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem className="px-4 text-sm">
                  {t("payments.page")} {currentPage} {t("payments.of")} {totalPages}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}