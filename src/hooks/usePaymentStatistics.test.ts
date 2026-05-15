import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePaymentStatistics, RentPayment } from './usePaymentStatistics';

const createPayment = (overrides: Partial<RentPayment> = {}): RentPayment => ({
  id: '1',
  amount_cents: 10000,
  currency: 'EUR',
  payment_due_date: '2024-01-01',
  status: 'paid',
  payment_received_date: null,
  ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }) => children;

describe('usePaymentStatistics', () => {
  describe('totalPaid calculation', () => {
    it('should return 0 when payments array is empty', () => {
      const { result } = renderHook(() => usePaymentStatistics([], true));
      expect(result.current.totalPaid).toBe(0);
    });

    it('should sum amount_cents of all paid payments', () => {
      const payments = [
        createPayment({ id: '1', amount_cents: 10000, status: 'paid' }),
        createPayment({ id: '2', amount_cents: 15000, status: 'paid' }),
        createPayment({ id: '3', amount_cents: 20000, status: 'pending' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.totalPaid).toBe(250);
    });

    it('should ignore unpaid payments', () => {
      const payments = [
        createPayment({ id: '1', amount_cents: 10000, status: 'paid' }),
        createPayment({ id: '2', amount_cents: 10000, status: 'overdue' }),
        createPayment({ id: '3', amount_cents: 10000, status: 'pending' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.totalPaid).toBe(100);
    });
  });

  describe('nextDuePayment calculation', () => {
    it('should return undefined when no pending payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'paid', payment_due_date: '2024-01-01' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.nextDuePayment).toBeUndefined();
    });

    it('should return the earliest pending payment', () => {
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
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.nextDuePayment?.id).toBe('2');
    });

    it('should ignore past due payments', () => {
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
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.nextDuePayment?.id).toBe('2');
    });
  });

  describe('onTimePayments calculation', () => {
    it('should return 0 when no paid payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'pending' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimePayments).toBe(0);
    });

    it('should count payments where received_date <= due_date', () => {
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
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimePayments).toBe(2);
    });

    it('should not count payments without payment_received_date', () => {
      const payments = [
        createPayment({
          id: '1',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: null,
        }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimePayments).toBe(0);
    });
  });

  describe('onTimeRate calculation', () => {
    it('should return null when no completed payments', () => {
      const payments = [
        createPayment({ id: '1', status: 'pending' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimeRate).toBeNull();
    });

    it('should calculate percentage of on-time payments', () => {
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
          payment_received_date: '2024-01-10',
        }),
        createPayment({
          id: '4',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: '2024-01-10',
        }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimeRate).toBe(75);
    });

    it('should round to nearest integer', () => {
      const payments = [
        createPayment({
          id: '1',
          status: 'paid',
          payment_due_date: '2024-01-15',
          payment_received_date: '2024-01-14',
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
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.onTimeRate).toBe(67);
    });
  });

  describe('totalReminders calculation', () => {
    it('should return 0 when no payments have reminder_count', () => {
      const payments = [
        createPayment({ id: '1' }),
        createPayment({ id: '2' }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.totalReminders).toBe(0);
    });

    it('should sum reminder_count from all payments', () => {
      const payments = [
        createPayment({ id: '1', reminder_count: 2 }),
        createPayment({ id: '2', reminder_count: 3 }),
        createPayment({ id: '3', reminder_count: 0 }),
      ];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.totalReminders).toBe(5);
    });
  });

  describe('formatCurrency', () => {
    it('should format amount with euro symbol and 2 decimal places', () => {
      const payments = [];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.formatCurrency(100)).toBe('€100.00');
      expect(result.current.formatCurrency(99.9)).toBe('€99.90');
      expect(result.current.formatCurrency(0)).toBe('€0.00');
    });
  });

  describe('stats array', () => {
    it('should return 4 stat items', () => {
      const payments = [];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      expect(result.current.stats).toHaveLength(4);
    });

    it('should include expected stat labels', () => {
      const payments = [];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      const labels = result.current.stats.map(s => s.label);
      expect(labels).toContain('payments.statistics.totalPaid');
      expect(labels).toContain('payments.statistics.nextDue');
      expect(labels).toContain('payments.statistics.onTimeRate');
      expect(labels).toContain('payments.statistics.remindersSent');
    });

    it('should have value and subtext for each stat', () => {
      const payments = [];
      const { result } = renderHook(() => usePaymentStatistics(payments, true));
      result.current.stats.forEach(stat => {
        expect(stat).toHaveProperty('value');
        expect(stat).toHaveProperty('subtext');
        expect(stat).toHaveProperty('iconColor');
        expect(stat).toHaveProperty('bgColor');
      });
    });
  });
});