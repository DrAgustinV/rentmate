import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRentPayments } from "@/hooks/useRentPayments";
import { usePropertyCosts } from "@/hooks/usePropertyCosts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, Euro, TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORY_COLORS: Record<string, string> = {
  community_fee: "#22c55e",
  property_tax: "#ef4444",
  maintenance: "#f59e0b",
  exceptional: "#6366f1",
  insurance: "#ec4899",
  other: "#14b8a6",
};

interface FinancialAnalysisTabProps {
  propertyId: string;
  allTenants?: Array<{
    id: string;
    tenant_id: string;
    tenancy_status: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    started_at?: string;
    ended_at?: string | null;
  }> | null;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function getYear(dateStr: string): number {
  return new Date(dateStr).getFullYear();
}

function getMonth(dateStr: string): number {
  return new Date(dateStr).getMonth();
}

export function FinancialAnalysisTab({ propertyId, allTenants }: FinancialAnalysisTabProps) {
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: rentPayments, isLoading: rentLoading } = useRentPayments(propertyId);
  const { data: costs, isLoading: costsLoading } = usePropertyCosts(propertyId);

  const isLoading = rentLoading || costsLoading;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (rentPayments || []).forEach(p => years.add(getYear(p.payment_due_date).toString()));
    (costs || []).forEach(c => {
      const date = c.dueDate || c.createdAt;
      years.add(getYear(date).toString());
    });
    return Array.from(years).sort().reverse();
  }, [rentPayments, costs]);

  const monthlyData = useMemo(() => {
    const data: { month: string; rent: number; costs: number; net: number }[] = MONTHS.map(m => ({
      month: m,
      rent: 0,
      costs: 0,
      net: 0,
    }));

    (rentPayments || [])
      .filter(p => p.status === "paid" && (selectedYear === "all" || getYear(p.payment_due_date).toString() === selectedYear))
      .forEach(p => {
        const month = getMonth(p.payment_due_date);
        data[month].rent += p.amount_cents;
      });

    (costs || [])
      .filter(c => {
        const date = c.dueDate || c.createdAt;
        return (selectedYear === "all" || getYear(date).toString() === selectedYear);
      })
      .forEach(c => {
        const date = c.dueDate || c.createdAt;
        const month = getMonth(date);
        data[month].costs += c.amountCents;
      });

    data.forEach(d => {
      d.net = d.rent - d.costs;
    });

    return data;
  }, [rentPayments, costs, selectedYear]);

  const totals = useMemo(() => {
    const totalRent = monthlyData.reduce((sum, m) => sum + m.rent, 0);
    const totalCosts = monthlyData.reduce((sum, m) => sum + m.costs, 0);
    return { totalRent, totalCosts, netBenefit: totalRent - totalCosts };
  }, [monthlyData]);

  const costBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    (costs || [])
      .filter(c => {
        const date = c.dueDate || c.createdAt;
        return selectedYear === "all" || getYear(date).toString() === selectedYear;
      })
      .forEach(c => {
        breakdown[c.costCategory] = (breakdown[c.costCategory] || 0) + c.amountCents;
      });
    return Object.entries(breakdown)
      .map(([category, value]) => ({ category, name: t(`costs.filters.${category}`) || category, value }))
      .sort((a, b) => b.value - a.value);
  }, [costs, selectedYear, t]);

  const tenantBreakdown = useMemo(() => {
    if (!allTenants || allTenants.length === 0) return [];
    const presentLabel = "Present";
    return allTenants
      .filter(tenant => tenant.tenant_id)
      .map(tenant => {
        const total = (rentPayments || [])
          .filter(p => p.tenant_id === tenant.tenant_id && p.status === "paid")
          .filter(p => selectedYear === "all" || getYear(p.payment_due_date).toString() === selectedYear)
          .reduce((sum, p) => sum + p.amount_cents, 0);
        const periodStart = tenant.started_at ? format(parseISO(tenant.started_at), "MMM yyyy") : "—";
        const periodEnd = tenant.ended_at ? format(parseISO(tenant.ended_at), "MMM yyyy") : tenant.tenancy_status === "historic" ? "—" : presentLabel;
        return {
          name: tenant.first_name || tenant.last_name ? `${tenant.first_name || ""} ${tenant.last_name || ""}`.trim() : tenant.email,
          totalRentCents: total,
          period: `${periodStart} – ${periodEnd}`,
        };
      })
      .filter(t => t.totalRentCents > 0)
      .sort((a, b) => b.totalRentCents - a.totalRentCents);
  }, [allTenants, rentPayments, selectedYear]);

  const hasData = rentPayments && rentPayments.length > 0 && costs && costs.length > 0 && totals.totalRent + totals.totalCosts > 0;
  const hasAnyData = (rentPayments && rentPayments.length > 0) || (costs && costs.length > 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* <h2 className="text-lg font-semibold">{t("financial.title")}</h2> */}
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("financial.year")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("financial.allYears")}</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title={t("financial.noData")}
          size="large"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("financial.summary.totalRent")}
                </CardTitle>
                <Euro className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(totals.totalRent)}</div>
                {totals.totalRent > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.totalCosts > 0
                      ? `${((totals.netBenefit / totals.totalRent) * 100).toFixed(1)}% ${t("financial.margin") || "margin"}`
                      : "—"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("financial.summary.totalCosts")}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalCosts)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("financial.summary.netBenefit")}
                </CardTitle>
                {totals.netBenefit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totals.netBenefit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(totals.netBenefit)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("financial.monthlyBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tickFormatter={(v: number) => `${(v / 100).toFixed(0)}€`}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="rent" name={t("financial.rent")} fill="#86efac" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" name={t("financial.costs")} fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left font-medium pb-2 pr-4">{t("financial.month")}</th>
                      <th className="text-right font-medium pb-2 pr-4">{t("financial.rent")}</th>
                      <th className="text-right font-medium pb-2 pr-4">{t("financial.costs")}</th>
                      <th className="text-right font-medium pb-2">{t("financial.net")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.month}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-success">{row.rent > 0 ? formatCurrency(row.rent) : "—"}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-destructive">{row.costs > 0 ? formatCurrency(row.costs) : "—"}</td>
                        <td className={`py-2 text-right tabular-nums font-medium ${row.net >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(row.net)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-semibold">
                      <td className="py-2 pr-4">{t("financial.total")}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-success">{formatCurrency(totals.totalRent)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-destructive">{formatCurrency(totals.totalCosts)}</td>
                      <td className={`py-2 text-right tabular-nums ${totals.netBenefit >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(totals.netBenefit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {costBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("financial.costBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {costBreakdown.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CATEGORY_COLORS[entry.name] || "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex flex-col justify-center gap-2">
                    {costBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[item.name] || "#94a3b8" }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tenantBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("financial.tenantBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left font-medium pb-2 pr-4">{t("financial.tenant")}</th>
                        <th className="text-left font-medium pb-2 pr-4">{t("financial.period")}</th>
                        <th className="text-right font-medium pb-2 pr-4">{t("financial.rentPaid")}</th>
                        <th className="text-right font-medium pb-2">{t("financial.percentOfTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantBreakdown.map((t) => (
                        <tr key={t.name} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{t.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{t.period}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(t.totalRentCents)}</td>
                          <td className="py-2 text-right tabular-nums">
                            {totals.totalRent > 0
                              ? `${((t.totalRentCents / totals.totalRent) * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
