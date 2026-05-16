import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { calculatePaymentStats, type PaymentStatsInput } from '@/lib/paymentUtils';
import { usePaymentStatistics } from './usePaymentStatistics';

const createPayment = (overrides: Partial<PaymentStatsInput> = {}): PaymentStatsInput => ({
  id: '1',
  amount_cents: 10000,
  currency: 'EUR',
  payment_due_date: '2024-01-01',
  status: 'paid',
  payment_received_date: null,
  ...overrides,
});

describe('calculatePaymentStats', () => {
  describe('totalPaid', () => {
    it('returns 0 when payments array is empty', () => {
      const result = calculatePaymentStats([]);
      expect(result.totalPaid).toBe(0);
    });

    it('sums amount_cents of all paid payments', () => {
      const payments = [
        createPayment({ id: '1', amount_cents: 10000, status: 'paid' }),
        createPayment({ id: '2', amount_cents: 15000, status: 'paid' }),
        createPayment({ id: '3', amount_cents: 20000, status: 'pending' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.totalPaid).toBe(250);
    });

    it('ignores unpaid payments', () => {
      const payments = [
        createPayment({ id: '1', amount_cents: 10000, status: 'paid' }),
        createPayment({ id: '2', amount_cents: 10000, status: 'overdue' }),
        createPayment({ id: '3', amount_cents: 10000, status: 'pending' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.totalPaid).toBe(100);
    });
  });

  describe('nextDuePayment', () => {
    it('returns undefined when no pending payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'paid', payment_due_date: '2024-01-01' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.nextDuePayment).toBeUndefined();
    });

    it('returns the earliest pending payment', () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 60);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 30);
      const futureDate3 = new Date();
      futureDate3.setDate(futureDate3.getDate() + 45);

      const payments = [
        createPayment({ id: '1', status: 'pending', payment_due_date: futureDate1.toISOString().split('T')[0] }),
        createPayment({ id: '2', status: 'pending', payment_due_date: futureDate2.toISOString().split('T')[0] }),
        createPayment({ id: '3', status: 'pending', payment_due_date: futureDate3.toISOString().split('T')[0] }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.nextDuePayment?.id).toBe('2');
    });

    it('ignores past due payments', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const payments = [
        createPayment({ id: '1', status: 'pending', payment_due_date: pastDateStr }),
        createPayment({ id: '2', status: 'pending', payment_due_date: futureDateStr }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.nextDuePayment?.id).toBe('2');
    });
  });

  describe('onTimePayments', () => {
    it('returns 0 when no paid payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'pending' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimePayments).toBe(0);
    });

    it('counts payments where received_date <= due_date', () => {
      const payments = [
        createPayment({
          id: '1',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: '2024-01-10',
        }),
        createPayment({
          id: '2',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: '2024-01-20',
        }),
        createPayment({
          id: '3',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: '2024-01-15',
        }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimePayments).toBe(2);
    });

    it('does not count payments without payment_received_date', () => {
      const payments = [
        createPayment({
          id: '1',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: null,
        }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimePayments).toBe(0);
    });
  });

  describe('onTimeRate', () => {
    it('returns null when no completed payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'pending' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimeRate).toBeNull();
    });

    it('calculates percentage of on-time payments', () => {
      const payments = [
        createPayment({
          id: '1', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-10',
        }),
        createPayment({
          id: '2', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-20',
        }),
        createPayment({
          id: '3', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-10',
        }),
        createPayment({
          id: '4', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-10',
        }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimeRate).toBe(75);
    });

    it('rounds to nearest integer', () => {
      const payments = [
        createPayment({
          id: '1', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-14',
        }),
        createPayment({
          id: '2', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-20',
        }),
        createPayment({
          id: '3', status: 'paid', payment_due_date: '2024-01-15', payment_received_date: '2024-01-15',
        }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.onTimeRate).toBe(67);
    });
  });

  describe('totalReminders', () => {
    it('returns 0 when no payments have reminder_count', () => {
      const payments = [
        createPayment({ id: '1' }),
        createPayment({ id: '2' }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.totalReminders).toBe(0);
    });

    it('sums reminder_count from all payments', () => {
      const payments = [
        createPayment({ id: '1', reminder_count: 2 }),
        createPayment({ id: '2', reminder_count: 3 }),
        createPayment({ id: '3', reminder_count: 0 }),
      ];
      const result = calculatePaymentStats(payments);
      expect(result.totalReminders).toBe(5);
    });
  });

  describe('formatCurrency', () => {
    it('formats amount with euro symbol and 2 decimal places', () => {
      const result = calculatePaymentStats([]);
      expect(result.formatCurrency(100)).toBe('€100.00');
      expect(result.formatCurrency(99.9)).toBe('€99.90');
      expect(result.formatCurrency(0)).toBe('€0.00');
    });
  });
});

describe('usePaymentStatistics', () => {
  it('returns 4 stat items', () => {
    const { result } = renderHook(() => usePaymentStatistics([], true));
    expect(result.current.stats).toHaveLength(4);
  });

  it('includes expected stat labels', () => {
    const { result } = renderHook(() => usePaymentStatistics([], true));
    const labels = result.current.stats.map(s => s.label);
    expect(labels).toContain('payments.statistics.totalPaid');
    expect(labels).toContain('payments.statistics.nextDue');
    expect(labels).toContain('payments.statistics.onTimeRate');
    expect(labels).toContain('payments.statistics.remindersSent');
  });

  it('has value and subtext for each stat', () => {
    const { result } = renderHook(() => usePaymentStatistics([], true));
    result.current.stats.forEach(stat => {
      expect(stat).toHaveProperty('value');
      expect(stat).toHaveProperty('subtext');
      expect(stat).toHaveProperty('iconColor');
      expect(stat).toHaveProperty('bgColor');
    });
  });
});
