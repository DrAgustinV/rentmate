import { Card, CardContent } from "@/components/ui/card";
import { Coins, Calendar, TrendingUp, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, differenceInDays } from "date-fns";

interface RentPayment {
  id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  status: string;
  payment_received_date: string | null;
  reminder_count?: number;
}

interface PaymentStatisticsProps {
  payments: RentPayment[];
  hasData: boolean;
}

export function PaymentStatistics({ payments, hasData }: PaymentStatisticsProps) {
  const { t } = useLanguage();

  // Calculate statistics
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_cents, 0) / 100;

  const nextDuePayment = payments
    .filter(p => p.status === 'pending' && new Date(p.payment_due_date) >= new Date())
    .sort((a, b) => new Date(a.payment_due_date).getTime() - new Date(b.payment_due_date).getTime())[0];

  const onTimePayments = payments.filter(p => {
    if (p.status !== 'paid' || !p.payment_received_date) return false;
    return new Date(p.payment_received_date) <= new Date(p.payment_due_date);
  }).length;

  const totalCompletedPayments = payments.filter(p => p.status === 'paid').length;
  const onTimeRate = totalCompletedPayments > 0 
    ? Math.round((onTimePayments / totalCompletedPayments) * 100) 
    : null;

  const totalReminders = payments.reduce((sum, p) => sum + (p.reminder_count || 0), 0);

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getNextDueInfo = () => {
    if (!nextDuePayment) return { text: t("payments.statistics.noData"), days: null };
    
    const daysUntil = differenceInDays(new Date(nextDuePayment.payment_due_date), new Date());
    
    if (daysUntil === 0) return { text: t("common.today"), days: 0 };
    if (daysUntil === 1) return { text: t("common.tomorrow"), days: 1 };
    if (daysUntil > 1) return { text: `${t("common.in")} ${daysUntil} ${t("common.days")}`, days: daysUntil };
    return { text: format(new Date(nextDuePayment.payment_due_date), 'MMM d'), days: null };
  };

  const nextDueInfo = getNextDueInfo();

  const stats = [
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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtext}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}