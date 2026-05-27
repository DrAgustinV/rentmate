import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/contexts/RoleContext";
import { useProperties } from "@/hooks/useProperties";
import { useTenantProperties } from "@/hooks/useTenantProperties";
import { propertyService } from "@/services";
import { supabase } from "@/integrations/supabase/client";
import type { PropertyDomain } from "@/types/domain";

interface MonthlyPayment {
  month: string;
  paid: number;
  overdue: number;
}

export interface PropertyCardData {
  id: string;
  title: string;
  address?: string;
  city?: string;
  images?: string[];
  status: string;
  occupancy_status: string;
  tenant_name: string | null;
  payment_status: string;
  open_tickets_count: number;
}

export interface DashboardData {
  activeRole: "manager" | "tenant";
  totalProperties: number;
  activePropertiesCount: number;
  endingTenancyCount: number;
  archivedCount: number;
  openTicketsCount: number;
  ticketsByStatus: { status: string; count: number }[];
  monthlyPayments: MonthlyPayment[];
  propertyCards: PropertyCardData[];
  userId: string | null;
  isLoading: boolean;
}

interface TicketRow {
  id: string;
  status: string;
  property_id: string;
}

interface PaymentRow {
  amount_cents: number;
  status: string;
  payment_due_date: string;
  property_id: string;
}

interface IndicatorRow {
  property_id: string;
  rent_overdue: boolean;
  utility_overdue: boolean;
  rent_has_data: boolean;
}

interface TenantStatusRow {
  property_id: string;
  status: string;
  tenant_name: string | null;
  tenant_email: string | null;
  pending_invites: number;
}

export function useDashboardData(): DashboardData {
  const { activeRole } = useRole();

  const { data: userIdData } = useQuery({
    queryKey: ["dashboard-current-user"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const userId = userIdData ?? null;

  const { data: propertiesData, isLoading: propertiesLoading } = useProperties({
    managerId: activeRole === "manager" && userId ? userId : undefined,
  });

  const { data: tenantPropertiesData, isLoading: tenantLoading } = useTenantProperties({
    tenantId: activeRole === "tenant" && userId ? userId : undefined,
  });

  const properties = useMemo(() => (propertiesData?.properties as PropertyDomain[]) || [], [propertiesData]);
  const tenantProperties = useMemo(() => (tenantPropertiesData?.properties as PropertyDomain[]) || [], [tenantPropertiesData]);

  const allProperties = useMemo(
    () => (activeRole === "manager" ? properties : tenantProperties),
    [activeRole, properties, tenantProperties],
  );

  const propertyIds = useMemo(() => allProperties.map((p) => p.id), [allProperties]);

  const activePropertiesCount = useMemo(
    () => allProperties.filter((p) => p.status === "active").length,
    [allProperties],
  );
  const endingTenancyCount = useMemo(
    () => allProperties.filter((p) => p.status === "ending_tenancy").length,
    [allProperties],
  );
  const archivedCount = useMemo(
    () => allProperties.filter((p) => p.status === "inactive").length,
    [allProperties],
  );

  // Fetch all tickets
  const { data: allTickets } = useQuery<TicketRow[]>({
    queryKey: ["dashboard-all-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, property_id");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const ticketCounts = useMemo(() => {
    const counts = { open: 0, inProgress: 0, resolved: 0 };
    if (!allTickets) return counts;
    for (const t of allTickets) {
      if (t.status === "open") counts.open++;
      else if (t.status === "in_progress") counts.inProgress++;
      else if (t.status === "resolved") counts.resolved++;
    }
    return counts;
  }, [allTickets]);

  // Fetch rent payments across all properties
  const { data: rentPayments } = useQuery<PaymentRow[]>({
    queryKey: ["dashboard-rent-payments", ...propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from("rent_payments")
        .select("amount_cents, status, payment_due_date, property_id")
        .in("property_id", propertyIds);
      if (error) throw error;
      return data || [];
    },
    enabled: propertyIds.length > 0,
    staleTime: 30_000,
  });

  const monthlyPayments = useMemo(() => {
    if (!rentPayments) return [];
    const byMonth: Record<string, { paid: number; overdue: number }> = {};
    for (const p of rentPayments) {
      const month = p.payment_due_date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { paid: 0, overdue: 0 };
      if (p.status === "paid") {
        byMonth[month].paid += p.amount_cents;
      } else if (p.status === "overdue" || (p.status === "pending" && new Date(p.payment_due_date) < new Date())) {
        byMonth[month].overdue += p.amount_cents;
      }
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        paid: Math.round(data.paid / 100),
        overdue: Math.round(data.overdue / 100),
      }));
  }, [rentPayments]);

  // Fetch status indicators for all properties
  const { data: indicators } = useQuery<IndicatorRow[]>({
    queryKey: ["dashboard-status-indicators", ...propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const results = await Promise.all(
        propertyIds.map((id) => propertyService.getPropertyStatusIndicators(id)),
      );
      return results.filter(Boolean) as IndicatorRow[];
    },
    enabled: propertyIds.length > 0,
    staleTime: 60_000,
  });

  const indicatorMap = useMemo(() => {
    const map: Record<string, IndicatorRow | undefined> = {};
    if (indicators) {
      for (const ind of indicators) {
        map[ind.property_id] = ind;
      }
    }
    return map;
  }, [indicators]);

  // Fetch tenant status for all properties
  const { data: tenantStatuses } = useQuery<TenantStatusRow[]>({
    queryKey: ["dashboard-tenant-statuses", ...propertyIds],
    queryFn: async () => {
      if (propertyIds.length === 0) return [];
      const results = await Promise.all(
        propertyIds.map((id) => propertyService.getPropertyTenantStatus(id)),
      );
      return results.filter(Boolean) as TenantStatusRow[];
    },
    enabled: propertyIds.length > 0,
    staleTime: 60_000,
  });

  const tenantStatusMap = useMemo(() => {
    const map: Record<string, TenantStatusRow | undefined> = {};
    if (tenantStatuses) {
      for (const ts of tenantStatuses) {
        map[ts.property_id] = ts;
      }
    }
    return map;
  }, [tenantStatuses]);

  // Build property card data
  const propertyCards = useMemo<PropertyCardData[]>(() => {
    return allProperties.map((p) => {
      const indicator = indicatorMap[p.id];
      const tenantStatus = tenantStatusMap[p.id];

      const occupancy = tenantStatus?.status === "occupied" ? "Active"
        : tenantStatus?.status === "invited" ? "Ending"
        : "Vacant";

      const paymentStatus = indicator?.rent_overdue ? "Overdue"
        : indicator?.utility_overdue ? "Partial"
        : indicator?.rent_has_data ? "Paid"
        : "No rent";

      const openTickets = allTickets?.filter(t => t.property_id === p.id && t.status === "open").length || 0;

      return {
        id: p.id,
        title: p.title,
        address: p.address,
        city: p.city,
        images: p.images as string[] | undefined,
        status: p.status,
        occupancy_status: occupancy,
        tenant_name: tenantStatus?.tenant_name || null,
        payment_status: paymentStatus,
        open_tickets_count: openTickets,
      };
    });
  }, [allProperties, indicatorMap, tenantStatusMap, allTickets]);

  const isLoading = propertiesLoading || tenantLoading;

  return {
    activeRole,
    totalProperties: allProperties.length,
    activePropertiesCount,
    endingTenancyCount,
    archivedCount,
    openTicketsCount: ticketCounts.open + ticketCounts.inProgress,
    ticketsByStatus: [
      { status: "open", count: ticketCounts.open },
      { status: "in_progress", count: ticketCounts.inProgress },
      { status: "resolved", count: ticketCounts.resolved },
    ],
    monthlyPayments,
    propertyCards,
    userId,
    isLoading,
  };
}
