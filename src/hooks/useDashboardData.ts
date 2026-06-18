import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/contexts/RoleContext";
import { useProperties } from "@/hooks/useProperties";
import { useTenantProperties } from "@/hooks/useTenantProperties";
import { supabase } from "@/integrations/supabase/client";
import type { PropertyDomain } from "@/types/domain";

interface MonthlyPayment {
  month: string;
  paid: number;
  overdue: number;
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
      .filter(([month]) => {
        const d = new Date(month + '-01');
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 12);
        return d >= cutoff;
      })
      .map(([month, data]) => ({
        month,
        paid: Math.round(data.paid / 100),
        overdue: Math.round(data.overdue / 100),
      }));
  }, [rentPayments]);

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
    userId,
    isLoading,
  };
}
