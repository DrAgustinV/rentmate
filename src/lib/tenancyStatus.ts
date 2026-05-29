import type { TenancyStatus } from "@/types/domain";

export function computeTenancyStatus(tenancy: {
  started_at: string | null;
  vacate_date: string | null;
  grace_days: number | null;
}): TenancyStatus {
  if (!tenancy.started_at) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(tenancy.started_at);
  start.setHours(0, 0, 0, 0);

  if (start > today) return "pending";

  if (tenancy.vacate_date) {
    const vacate = new Date(tenancy.vacate_date);
    vacate.setHours(0, 0, 0, 0);
    const graceEnd = new Date(vacate);
    graceEnd.setDate(graceEnd.getDate() + (tenancy.grace_days ?? 60));
    graceEnd.setHours(0, 0, 0, 0);
    if (graceEnd < today) return "historic";
    return "ending_tenancy";
  }

  return "active";
}

export function getTenancyDisplayLabel(status: TenancyStatus, vacateDate: string | null): string {
  if (!status) return "";
  if (status === "active") return vacateDate ? "Active (leaving)" : "Active";
  if (status === "ending_tenancy") return "Active (leaving)";
  if (status === "pending") return "Pending";
  if (status === "historic") return "Ended";
  return status;
}
