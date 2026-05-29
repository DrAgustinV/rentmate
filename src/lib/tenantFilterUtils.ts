export type TenantFilter = "all" | "current" | "next" | "historic";

export function filterTenantsByPill<T extends { tenancy_status: string }>(
  tenants: T[],
  pill: TenantFilter,
): T[] {
  switch (pill) {
    case "current":
      return tenants.filter(
        (t) => t.tenancy_status === "active" || t.tenancy_status === "ending_tenancy",
      );
    case "next":
      return tenants.filter((t) => t.tenancy_status === "pending");
    case "historic":
      return tenants.filter((t) => t.tenancy_status === "historic");
    case "all":
    default:
      return tenants;
  }
}
