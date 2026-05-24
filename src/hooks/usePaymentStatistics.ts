import { useMemo } from "react";
import { Coins, Calendar, TrendingUp, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { calculatePaymentStats, type PaymentStatsInput } from "@/lib/paymentUtils";

export type RentPayment = PaymentStatsInput;

export interface PaymentStatisticsResult {
  totalPaid: number;
  nextDuePayment: PaymentStatsInput | undefined;
  onTimePayments: number;
  totalCompletedPayments: number;
  onTimeRate: number | null;
  totalReminders: number;
  formatCurrency: (amount: number) => string;
  nextDueInfo: { text: string; days: number | null };
  stats: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    subtext: string;
    iconColor: string;
    bgColor: string;
  }>;
}

export function usePaymentStatistics(payments: PaymentStatsInput[], hasData: boolean): PaymentStatisticsResult {
  const { t } = useLanguage();

  const stats = useMemo(() => calculatePaymentStats(payments), [payments]);

  const nextDueInfo = useMemo(() => {
    if (!stats.nextDuePayment) return { text: t("payments.statistics.noData"), days: null };
    if (stats.nextDueDays === 0) return { text: t("common.today"), days: 0 };
    if (stats.nextDueDays === 1) return { text: t("common.tomorrow"), days: 1 };
    if (stats.nextDueDays !== null && stats.nextDueDays > 1) {
      return { text: `${t("common.in")} ${stats.nextDueDays} ${t("common.days")}`, days: stats.nextDueDays };
    }
    return { text: format(new Date(stats.nextDuePayment.payment_due_date), 'MMM d'), days: null };
  }, [stats.nextDuePayment, stats.nextDueDays, t]);

  const statItems = useMemo(() => [
    {
      icon: Coins as LucideIcon,
      label: t("payments.statistics.totalPaid"),
      value: hasData ? stats.formatCurrency(stats.totalPaid) : stats.formatCurrency(0),
      subtext: hasData ? `${stats.totalCompletedPayments} ${t("payments.statistics.payments")}` : t("payments.statistics.noData"),
      iconColor: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Calendar as LucideIcon,
      label: t("payments.statistics.nextDue"),
      value: hasData && stats.nextDuePayment ? stats.formatCurrency(stats.nextDuePayment.amount_cents / 100) : t("common.none"),
      subtext: nextDueInfo.text,
      iconColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? "text-warning" : "text-info",
      bgColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? "bg-warning/10" : "bg-info/10",
    },
    {
      icon: TrendingUp as LucideIcon,
      label: t("payments.statistics.onTimeRate"),
      value: stats.onTimeRate !== null ? `${stats.onTimeRate}%` : t("common.na"),
      subtext: hasData ? `${stats.onTimePayments} ${t("common.of")} ${stats.totalCompletedPayments}` : t("payments.statistics.noHistory"),
      iconColor: stats.onTimeRate && stats.onTimeRate >= 90 ? "text-success" : "text-warning",
      bgColor: stats.onTimeRate && stats.onTimeRate >= 90 ? "bg-success/10" : "bg-warning/10",
    },
    {
      icon: Bell as LucideIcon,
      label: t("payments.statistics.remindersSent"),
      value: stats.totalReminders.toString(),
      subtext: stats.totalReminders > 0 ? t("payments.statistics.totalReminders") : t("payments.statistics.noneYet"),
      iconColor: stats.totalReminders > 5 ? "text-warning" : "text-muted-foreground",
      bgColor: stats.totalReminders > 5 ? "bg-warning/10" : "bg-muted/50",
    },
  ], [t, hasData, stats, nextDueInfo]);

  return {
    totalPaid: stats.totalPaid,
    nextDuePayment: stats.nextDuePayment,
    onTimePayments: stats.onTimePayments,
    totalCompletedPayments: stats.totalCompletedPayments,
    onTimeRate: stats.onTimeRate,
    totalReminders: stats.totalReminders,
    formatCurrency: stats.formatCurrency,
    nextDueInfo,
    stats: statItems,
  };
}
