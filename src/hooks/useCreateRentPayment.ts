import { useRentPaymentMutations } from './useRentPayments';

export function useCreateRentPayment() {
  const { createPayment } = useRentPaymentMutations();
  return createPayment;
}