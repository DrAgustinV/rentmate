// ... imports
import { useMemo, useCallback } from 'react';

export function usePaymentsTab(payments: RentPayment[], hasData: boolean) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const formatCurrency = useCallback((amount: number) => `€${amount.toFixed(2)}`, []);

  const totalPaid = useMemo(() =>
    payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_cents, 0) / 100,
    [payments]
  );

  const nextDuePayment = useMemo(() =>
    payments
      .filter(p => p.status === 'pending' && new Date(p.payment_due_date) >= new Date())
      .sort((a, b) => new Date(a.payment_due_date).getTime() - new Date(b.payment_due_date).getTime())[0],
    [payments]
  );

  const onTimePayments = useMemo(() =>
    payments.filter(p => p.status === 'paid' && p.payment_received_date && new Date(p.payment_received_date) <= new Date(p.payment_due_date)).length,
    [payments]
  );

  const totalCompletedPayments = useMemo(() => payments.filter(p => p.status === 'paid').length, [payments]);

  const onTimeRate = useMemo(() =>
    totalCompletedPayments > 0 ? Math.round((onTimePayments / totalCompletedPayments) * 100) : null,
    [totalCompletedPayments, onTimePayments]
  );

  const totalReminders = useMemo(() => payments.reduce((sum, p) => sum + (p.reminder_count || 0), 0), [payments]);

  const nextDueInfo = useMemo(() => {
    if (!nextDuePayment) return { text: t('payments.statistics.noData'), days: null };
    const daysUntil = differenceInDays(new Date(nextDuePayment.payment_due_date), new Date());
    if (daysUntil === 0) return { text: t('common.today'), days: 0 };
    if (daysUntil === 1) return { text: t('common.tomorrow'), days: 1 };
    if (daysUntil > 1) return { text: `${t('common.in')} ${daysUntil} ${t('common.days')}`, days: daysUntil };
    return { text: format(new Date(nextDuePayment.payment_due_date), 'MMM d'), days: null };
  }, [nextDuePayment, t]);

  const totalPaidStat = useMemo(() => ({
    icon: 'Coins',
    label: t('payments.statistics.totalPaid'),
    value: hasData ? formatCurrency(totalPaid) : formatCurrency(0),
    subtext: hasData ? `${totalCompletedPayments} ${t('payments.statistics.payments')}` : t('payments.statistics.noData'),
    iconColor: 'text-success',
    bgColor: 'bg-success/10'
  }), [totalPaid, totalCompletedPayments, hasData, t, formatCurrency]);

  const nextDueStat = useMemo(() => ({
    icon: 'Calendar',
    label: t('payments.statistics.nextDue'),
    value: hasData && nextDuePayment ? formatCurrency(nextDuePayment.amount_cents / 100) : t('common.none'),
    subtext: nextDueInfo.text,
    iconColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? 'text-warning' : 'text-info',
    bgColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? 'bg-warning/10' : 'bg-info/10'
  }), [hasData, nextDuePayment, nextDueInfo, t, formatCurrency]);

  const onTimeRateStat = useMemo(() => ({
    icon: 'TrendingUp',
    label: t('payments.statistics.onTimeRate'),
    value: onTimeRate !== null ? `${onTimeRate}%` : t('common.na'),
    subtext: hasData ? `${onTimePayments} ${t('common.of')} ${totalCompletedPayments}` : t('payments.statistics.noHistory'),
    iconColor: onTimeRate && onTimeRate >= 90 ? 'text-success' : 'text-warning',
    bgColor: onTimeRate && onTimeRate >= 90 ? 'bg-success/10' : 'bg-warning/10'
  }), [onTimeRate, onTimePayments, totalCompletedPayments, hasData, t]);

  const remindersStat = useMemo(() => ({
    icon: 'Bell',
    label: t('payments.statistics.remindersSent'),
    value: totalReminders.toString(),
    subtext: totalReminders > 0 ? t('payments.statistics.totalReminders') : t('payments.statistics.noneYet'),
    iconColor: totalReminders > 5 ? 'text-warning' : 'text-muted-foreground',
    bgColor: totalReminders > 5 ? 'bg-warning/10' : 'bg-muted/50'
  }), [totalReminders, t]);

  const stats = useMemo(() => [totalPaidStat, nextDueStat, onTimeRateStat, remindersStat], [totalPaidStat, nextDueStat, onTimeRateStat, remindersStat]);

  // ... rest of your code (reviewMutation, handleDownload, return)
}
