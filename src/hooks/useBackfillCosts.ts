import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { PROPERTY_COSTS_QUERY_KEY } from "@/hooks/usePropertyCosts";
import { costService, authService } from "@/services";
import { formatDate } from "@/lib/dateUtils";
import { showToast } from "@/lib/toast";

export interface BackfillEntry {
  key: string;
  monthLabel: string;
  dueDate: string;
  amountCents: number;
  status: "paid" | "pending" | "missed";
  costCategory: string;
  description: string;
}

export function useBackfillCosts(propertyId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const backfillMutation = useMutation({
    mutationFn: async (entries: BackfillEntry[]) => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const toInsert = entries
        .filter(e => e.status !== "missed")
        .map(e => ({
          property_id: propertyId,
          cost_category: e.costCategory,
          description: e.description,
          amount_cents: e.amountCents,
          due_date: e.dueDate,
          status: e.status === "paid" ? "paid" : "pending",
          recurrence: "once" as const,
          notes: t("costs.backfill.notesDefault").replace("{date}", formatDate(new Date())),
        }));

      if (toInsert.length === 0) return [];
      return costService.backfillPropertyCosts(toInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPERTY_COSTS_QUERY_KEY, propertyId] });
      showToast.success(t("costs.backfill.success"));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t("costs.backfill.error"));
    },
  });

  return { backfillMutation };
}
