import { differenceInDays, format } from "date-fns";

export interface PaymentStatsInput {
  id: string;
  amount_cents: number;
  payment_due_date: string;
  status: string;
  payment_received_date: string | null;
  reminder_count?: number;
}

export interface PaymentStatsResult {
  totalPaid: number;
  nextDuePayment: PaymentStatsInput | undefined;
  onTimePayments: number;
  totalCompletedPayments: number;
  onTimeRate: number | null;
  totalReminders: number;
  formatCurrency: (amount: number) => string;
  nextDueDays: number | null;
}

export function calculatePaymentStats(payments: PaymentStatsInput[]): PaymentStatsResult {
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

  const nextDueDays = nextDuePayment
    ? differenceInDays(new Date(nextDuePayment.payment_due_date), new Date())
    : null;

  return {
    totalPaid,
    nextDuePayment,
    onTimePayments,
    totalCompletedPayments,
    onTimeRate,
    totalReminders,
    formatCurrency,
    nextDueDays,
  };
}
