import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, paymentService, authService } from '@/services';
import { STORAGE_BUCKETS } from '@/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/lib/toastUtils';
import { format, differenceInDays } from 'date-fns';

export interface RentPayment {
  id: string;
  amount_cents: number;
  currency: string;
  payment_due_date: string;
  status: string;
  payment_received_date: string | null;
  reminder_count?: number;
}

export function usePaymentsTab(payments: RentPayment[], hasData: boolean) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [showZoomModal, setShowZoomModal] = useState(false);

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

  const nextDueInfo = (() => {
    if (!nextDuePayment) return { text: t('payments.statistics.noData'), days: null };
    
    const daysUntil = differenceInDays(new Date(nextDuePayment.payment_due_date), new Date());
    
    if (daysUntil === 0) return { text: t('common.today'), days: 0 };
    if (daysUntil === 1) return { text: t('common.tomorrow'), days: 1 };
    if (daysUntil > 1) return { text: `${t('common.in')} ${daysUntil} ${t('common.days')}`, days: daysUntil };
    return { text: format(new Date(nextDuePayment.payment_due_date), 'MMM d'), days: null };
  })();

  const stats = [
    {
      icon: 'Coins',
      label: t('payments.statistics.totalPaid'),
      value: hasData ? formatCurrency(totalPaid) : formatCurrency(0),
      subtext: hasData ? `${totalCompletedPayments} ${t('payments.statistics.payments')}` : t('payments.statistics.noData'),
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      icon: 'Calendar',
      label: t('payments.statistics.nextDue'),
      value: hasData && nextDuePayment ? formatCurrency(nextDuePayment.amount_cents / 100) : t('common.none'),
      subtext: nextDueInfo.text,
      iconColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? 'text-orange-500' : 'text-blue-500',
      bgColor: nextDueInfo.days !== null && nextDueInfo.days <= 3 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      icon: 'TrendingUp',
      label: t('payments.statistics.onTimeRate'),
      value: onTimeRate !== null ? `${onTimeRate}%` : t('common.na'),
      subtext: hasData ? `${onTimePayments} ${t('common.of')} ${totalCompletedPayments}` : t('payments.statistics.noHistory'),
      iconColor: onTimeRate && onTimeRate >= 90 ? 'text-green-500' : 'text-yellow-500',
      bgColor: onTimeRate && onTimeRate >= 90 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      icon: 'Bell',
      label: t('payments.statistics.remindersSent'),
      value: totalReminders.toString(),
      subtext: totalReminders > 0 ? t('payments.statistics.totalReminders') : t('payments.statistics.noneYet'),
      iconColor: totalReminders > 5 ? 'text-orange-500' : 'text-muted-foreground',
      bgColor: totalReminders > 5 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted/50',
    },
  ];

  const reviewMutation = useMutation({
    mutationFn: async ({ paymentId, status, proofUrl }: { paymentId: string; status: 'approved' | 'rejected'; proofUrl: string }) => {
      const updates: any = {
        manager_reviewed: true,
        manager_reviewed_at: new Date().toISOString(),
        manager_reviewed_by: (await authService.getCurrentUser())?.id,
        proof_review_status: status,
        proof_review_notes: notes || null,
      };

      if (status === 'approved') {
        updates.status = 'paid';
        updates.payment_received_date = new Date().toISOString().split('T')[0];
      } else {
        updates.status = 'pending';
        updates.proof_of_payment_url = null;
        updates.tenant_confirmed = false;
        updates.tenant_confirmed_at = null;
      }

      await paymentService.updateRentPaymentSimple(paymentId, updates);

      if (status === 'rejected' && proofUrl) {
        await documentService.deleteFile(STORAGE_BUCKETS.PAYMENT_PROOFS, proofUrl);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      showToast.success({
        title: t('common.success'),
        description: variables.status === 'approved' 
          ? t('payments.proofReview.approvedSuccess')
          : t('payments.proofReview.rejectedSuccess'),
      });
      setNotes('');
    },
    onError: (error) => {
      console.error('Error reviewing proof:', error);
      showToast.error({
        title: t('common.error'),
        description: t('payments.proofReview.reviewError'),
      });
    },
  });

  const handleDownload = async (proofUrl: string) => {
    try {
      const data = await documentService.downloadFile(STORAGE_BUCKETS.PAYMENT_PROOFS, proofUrl);

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = proofUrl.split('/').pop() || 'payment-proof';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast.success({
        title: t('common.success'),
        description: t('payments.proofReview.downloadSuccess'),
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast.error({
        title: t('common.error'),
        description: t('payments.proofReview.downloadError'),
      });
    }
  };

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
    notes, setNotes,
    imageError, setImageError,
    imageZoom, setImageZoom,
    showZoomModal, setShowZoomModal,
    reviewMutation,
    handleDownload,
  };
}
