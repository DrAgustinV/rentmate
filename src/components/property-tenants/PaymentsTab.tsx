// ... imports
import { useMemo } from 'react';

// Inside PaymentsTab component:
const paginatedPayments = useMemo(() => 
  allPayments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
  [allPayments, currentPage]
);

// Replace inline mutation with stable reference
const toggleRemindersMutation = useMemo(() => useMutation({
  mutationFn: async ({ agreementId, enabled }: { agreementId: string; enabled: boolean }) => {
    await tenancyService.updateRentAgreementSimple(agreementId, { auto_reminders_enabled: enabled });
  },
  onSuccess: (_, { enabled }) => {
    queryClient.invalidateQueries({ queryKey: ['rent-agreements', propertyId] });
    showToast.success({ title: enabled ? t("payments.remindersEnabled") : t("payments.remindersDisabled") });
  },
  onError: (error: any) => showToast.error({ title: error.message }),
}), [queryClient, propertyId, t]);
