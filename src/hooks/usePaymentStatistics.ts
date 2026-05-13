import { useMemo, useCallback } from "react";
import { Coins, Calendar, TrendingUp, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, differenceInDays } from "date-fns";

export interface RentPayment {
  id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  status: string;
  payment_received_date: string | null;
  reminder_count?: number;
}

export interface PaymentStatisticsResult {
  totalPaid: number;
  nextDuePayment: RentPayment | undefined;
  onTimePayments: number;
  totalCompletedPayments: number;
  onTimeRate: number | null;
  totalReminders: number;
  formatCurrency: (amount: number) => string;
  nextDueInfo: { text: string; days: number | null };
  stats: Array<{
    icon: typeof Coins;
    label: string;
    value: string;
    subtext: string;
    iconColor: string;
    bgColor: string;
  }>;
}

export function usePaymentStatistics(payments: RentPayment[], hasData: boolean): PaymentStatisticsResult {
  const { t } = useLanguage();

  const totalPaid = useMemo(() => 
    payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0) / 100,
    [payments]
  );

  const nextDuePayment = useMemo(() => 
    payments
      .filter(p => p.status === 'pending' && new Date(p.payment_due_date) >= new Date())
      .sort((a, b) => new Date(a.payment_due_date).getTime() - new Date(b.payment_due_date).getTime())[0],
    [payments]
  );

  const onTimePayments = useMemo(() => 
    payments.filter(p => {
      if (p.status !== 'paid' || !p.payment_received_date) return false;
      return new Date(p.payment_received_date) <= new Date(p.payment_due_date);
    }).length,
    [payments]
  );

  const totalCompletedPayments = useMemo(() => 
    payments.filter(p => p.status === 'paid').length,
    [payments]
  );

  const onTimeRate = useMemo(() => 
    totalCompletedPayments > 0 
      ? Math.round((onTimePayments / totalCompletedPayments) * 100) 
      : null,
    [onTimePayments, totalCompletedPayments]
  );

  const totalReminders = useMemo(() => 
    payments.reduce((sum, p) => sum + (p.reminder_count || 0), 0),
    [payments]
  );

  const formatCurrency = useCallback((amount: number) => `€${amount.toFixed(2)}`, []);

  const nextDueInfo = useMemo(() => {
    if (!nextDuePayment) return { text: t("payments.statistics.noData"), days: null };
    
    const daysUntil = differenceInDays(new Date(nextDuePayment.payment_due_date), new Date());
    
    if (daysUntil === 0) return { text: t("common.today"), days: 0 };
    if (daysUntil === 1) return { text: t("common.tomorrow"), days: 1 };
    if (daysUntil > 1) return { text: `${t("common.in")} ${daysUntil} ${t("common.days")}`, days: daysUntil };
    return { text: format(new Date(nextDuePayment.payment_due_date), 'MMM d'), days: null };
  }, [nextDuePayment, t]);

  const stats = useMemo(() => [
    {
      icon: Coins,
      label: t("payments.statistics.totalPaid"),
      value: hasData ? formatCurrency(totalPaid) : formatCurrency(0),
      subtext: hasData ? `${totalCompletedPayments} ${t("payments.statistics.payments")}` : t("payments.statistics.noData"),
      iconColor: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      icon: Calendar,
      label: t("payments.statistics.nextDue"),
      value: hasData && nextDuePayment ? formatCurrency(nextDuePayment.amount_cents / 100) : t("common.none"),
      subtext: nextDueInfo.text,
      iconColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? "text-orange-500" : "text-blue-500",
      bgColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      icon: TrendingUp,
      label: t("payments.statistics.onTimeRate"),
      value: onTimeRate !== null ? `${onTimeRate}%` : t("common.na"),
      subtext: hasData ? `${onTimePayments} ${t("common.of")} ${totalCompletedPayments}` : t("payments.statistics.noHistory"),
      iconColor: onTimeRate && onTimeRate >= 90 ? "text-green-500" : "text-yellow-500",
      bgColor: onTimeRate && onTimeRate >= 90 ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20",
    },
    {
      icon: Bell,
      label: t("payments.statistics.remindersSent"),
      value: totalReminders.toString(),
      subtext: totalReminders > 0 ? t("payments.statistics.totalReminders") : t("payments.statistics.noneYet"),
      iconColor: totalReminders > 5 ? "text-orange-500" : "text-muted-foreground",
      bgColor: totalReminders > 5 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-muted/50",
    },
  ], [t, hasData, formatCurrency, totalPaid, totalCompletedPayments, nextDuePayment, nextDueInfo, onTimeRate, onTimePayments, totalReminders]);

  return {
    totalPaid,
    nextDuePayment,
    onTimePayments,
    totalCompletedPayments,
    onTimeRate,
    totalReminders,
    formatCurrency,
    nextDueInfo,
    stats,
  };
}
