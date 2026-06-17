import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentAgreements } from "@/hooks/useRentAgreements";
import { useRentPayments, RENT_PAYMENTS_QUERY_KEY } from "@/hooks/useRentPayments";
import { paymentService, authService } from "@/services";
import { showToast } from "@/lib/toast";

export interface MonthEntry {
  year: number;
  month: number;
  monthLabel: string;
  dueDate: string;
  amountCents: number;
  receivedDate: string;
}

export interface GapAnalysis {
  months: MonthEntry[];
  totalCount: number;
  totalAmountCents: number;
  fromLabel: string;
  toLabel: string;
  monthlyRentCents: number;
  hasGap: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function useBackfillPayments(
  propertyId: string,
  tenancyId: string,
  tenantProfileId?: string,
  options?: {
    fallbackStartDate?: Date | null;
    fallbackRentAmountCents?: number | null;
  },
) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { fallbackStartDate, fallbackRentAmountCents } = options ?? {};

  const { data: rentAgreements } = useRentAgreements(propertyId);
  const { data: rentPayments } = useRentPayments(propertyId);

  const activeAgreement = useMemo(
    () => rentAgreements?.find(ra => ra.tenancy_id === tenancyId && ra.is_active) ?? null,
    [rentAgreements, tenancyId],
  );

  const existingPaymentKeys = useMemo(() => {
    if (!rentPayments || !tenantProfileId) return new Set<string>();
    return new Set(
      rentPayments
        .filter(p => p.tenant_id === tenantProfileId)
        .map(p => p.payment_due_date.slice(0, 7)),
    );
  }, [rentPayments, tenantProfileId]);

  const backfillSource = useMemo(() => {
    if (activeAgreement) {
      return {
        type: "agreement" as const,
        id: activeAgreement.id,
        startDate: activeAgreement.start_date,
        rentAmountCents: activeAgreement.rent_amount_cents,
        paymentDay: activeAgreement.payment_day || 1,
        currency: activeAgreement.currency || "eur",
        tenantId: activeAgreement.tenant_id,
      };
    }

    if (fallbackStartDate && fallbackRentAmountCents) {
      return {
        type: "fallback" as const,
        id: undefined as string | undefined,
        startDate: fallbackStartDate.toISOString().split("T")[0],
        rentAmountCents: fallbackRentAmountCents,
        paymentDay: 1,
        currency: "eur",
        tenantId: tenantProfileId ?? "",
      };
    }

    return null;
  }, [activeAgreement, fallbackStartDate, fallbackRentAmountCents, tenantProfileId]);

  const gapAnalysis = useMemo((): GapAnalysis | null => {
    if (!backfillSource) return null;

    const startDate = new Date(backfillSource.startDate);
    const now = new Date();
    const paymentDay = backfillSource.paymentDay || 1;

    let year = startDate.getFullYear();
    let month = startDate.getMonth() + 1;

    const months: MonthEntry[] = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const key = `${year}-${pad(month)}`;
      if (!existingPaymentKeys.has(key)) {
        const lastDay = new Date(year, month, 0).getDate();
        const dueDay = Math.min(paymentDay, lastDay);
        const dueDate = `${year}-${pad(month)}-${pad(dueDay)}`;
        months.push({
          year,
          month,
          monthLabel: getMonthLabel(year, month),
          dueDate,
          amountCents: backfillSource.rentAmountCents,
          receivedDate: dueDate,
        });
      }

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    const totalAmountCents = months.reduce((sum, m) => sum + m.amountCents, 0);

    return {
      months,
      totalCount: months.length,
      totalAmountCents,
      fromLabel: months.length > 0 ? months[0].monthLabel : "",
      toLabel: months.length > 0 ? months[months.length - 1].monthLabel : "",
      monthlyRentCents: backfillSource.rentAmountCents,
      hasGap: months.length >= 2,
    };
  }, [backfillSource, existingPaymentKeys]);

  const backfillMutation = useMutation({
    mutationFn: async (months: MonthEntry[]) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      if (!backfillSource) throw new Error("No backfill source available");

      const payments = months.map(m => {
        const payment: Record<string, string | number | undefined> = {
          property_id: propertyId,
          tenant_id: backfillSource.tenantId,
          manager_id: user.id,
          amount_cents: m.amountCents,
          currency: backfillSource.currency,
          payment_due_date: m.dueDate,
          payment_received_date: m.receivedDate,
          status: 'paid',
          notes: "Data entered retrospectively",
        };

        if (backfillSource.id) {
          payment.rent_agreement_id = backfillSource.id;
        }

        return payment;
      });

      return paymentService.backfillRentPayments(payments as Parameters<typeof paymentService.backfillRentPayments>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RENT_PAYMENTS_QUERY_KEY, propertyId] });
      showToast.success(t("payments.backfill.success"));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t("payments.backfill.error"));
    },
  });

  return {
    gapAnalysis,
    activeAgreement,
    backfillMutation,
    existingPaymentKeys,
  };
}
