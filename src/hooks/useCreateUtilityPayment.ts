import { useUtilityPaymentMutations } from './useUtilityPayments';

export function useCreateUtilityPayment() {
  const { createPayment } = useUtilityPaymentMutations();
  return createPayment;
}