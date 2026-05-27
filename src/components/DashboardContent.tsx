import { useNavigate } from "react-router-dom";
import { Building2, Coins, TrendingUp, Ticket, Plus, Handshake, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PropertyDashboardCard } from "@/components/PropertyDashboardCard";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardData } from "@/hooks/useDashboardData";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))"];

export function DashboardContent() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    activeRole,
    totalProperties,
    activePropertiesCount,
    endingTenancyCount,
    openTicketsCount,
    ticketsByStatus,
    monthlyPayments,
    propertyCards,
    isLoading,
  } = useDashboardData();

  if (isLoading) {
    return <LoadingSkeleton preset="page" />;
  }

  const hasNoProperties = totalProperties === 0;

  if (hasNoProperties) {
    if (activeRole === "tenant") {
      return (
        <EmptyState
          icon={Handshake}
          title={t("dashboard.noTenantRentalsTitle")}
          description={t("dashboard.noTenantRentalsDesc")}
          action={
            <Button onClick={() => navigate("/invitations")}>
              <Mail className="mr-2 h-4 w-4" />
              {t("dashboard.checkInvitations")}
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={Building2}
        title={t("dashboard.noPropertiesTitle")}
        description={t("dashboard.noPropertiesDesc")}
        action={
          <Button onClick={() => navigate("/properties")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("dashboard.addFirstProperty")}
          </Button>
        }
      />
    );
  }

  const ticketsChartData = ticketsByStatus.filter((d) => d.count > 0);
  const hasTickets = ticketsChartData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("header.dashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          {activeRole === "manager" ? t("dashboard.managerSubtitle") : t("dashboard.tenantSubtitle")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalProperties")}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activePropertiesCount} {t("dashboard.active")}
              {endingTenancyCount > 0 && ` · ${endingTenancyCount} ${t("properties.status.ending_tenancy")?.toLowerCase() || "ending"}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.rentCollected")}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyPayments.length > 0
                ? `€${monthlyPayments.reduce((sum, m) => sum + m.paid, 0).toLocaleString()}`
                : "€0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("payments.statistics.totalPaid")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.openTickets")}</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTicketsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ticketsByStatus.find((d) => d.status === "in_progress")?.count || 0} {t("tickets.inProgress")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.onTimePaymentRate")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyPayments.length > 0
                ? `${Math.round(
                    (monthlyPayments.reduce((s, m) => s + m.paid, 0) /
                      (monthlyPayments.reduce((s, m) => s + m.paid + m.overdue, 0) || 1)) *
                      100,
                  )}%`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyPayments.length > 0 ? `${monthlyPayments.length} months` : t("payments.statistics.noData")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Rent Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.rentOverTime")}</CardTitle>
            <CardDescription>{t("dashboard.rentOverTimeDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyPayments.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyPayments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="paid" stroke="hsl(var(--primary))" name={t("payments.statistics.totalPaid")} strokeWidth={2} />
                  <Line type="monotone" dataKey="overdue" stroke="hsl(var(--destructive))" name="Overdue" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t("payments.statistics.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.ticketsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasTickets ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketsChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                    nameKey="status"
                  >
                    {ticketsChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t("dashboard.noTicketData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("properties.title")}</h2>
          <Button variant="outline" size="sm" onClick={() => navigate("/properties")}>
            {t("dashboard.viewAllProperties")}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propertyCards.map((card) => (
            <PropertyDashboardCard
              key={card.id}
              property={card}
              dashboard={{
                occupancy_status: card.occupancy_status,
                tenant_name: card.tenant_name,
                payment_status: card.payment_status,
                open_tickets_count: card.open_tickets_count,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
