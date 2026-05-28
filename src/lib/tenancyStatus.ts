import { differenceInDays } from "date-fns";
import type { TenancyStatus } from "@/types/domain";

const ENDING_WINDOW_DAYS = 60;

export function computeTenancyStatus(tenancy: {
  tenancy_status: string | null;
  planned_ending_date: string | null;
}): TenancyStatus {
  if (!tenancy.tenancy_status) return null;
  if (tenancy.tenancy_status === "historic") return "historic";
  if (tenancy.tenancy_status === "pending") return "pending";

  if (tenancy.tenancy_status === "active" && tenancy.planned_ending_date) {
    const daysUntilEnd = differenceInDays(
      new Date(tenancy.planned_ending_date),
      new Date(),
    );
    if (daysUntilEnd <= ENDING_WINDOW_DAYS) return "ending_tenancy";
  }

  return tenancy.tenancy_status;
}
