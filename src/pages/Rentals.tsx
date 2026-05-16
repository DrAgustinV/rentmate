import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authService, tenantService, tenancyService } from "@/services";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, Building, Users, Calendar, Mail, Bell, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { useQueryClient } from '@tanstack/react-query';
import { TENANT_PROPERTIES_QUERY_KEY } from '@/hooks/useTenantProperties';
import { TenantOnboardingChecklist } from "@/components/property-tenants/TenantOnboardingChecklist";

interface TenancyRelationship {
  id: string;
  property_id: string;
  tenant_id: string;
  property_title: string;
  property_address: string;
  tenant_name: string;
  tenant_email: string;
  rent_amount_cents: number;
  currency: string;
  contract_start: string | null;
  contract_end: string | null;
  tenancy_status: string;
  last_payment_status: string | null;
}

interface Invitation {
  id: string;
  property_id: string;
  email: string;
  status: string;
  created_at: string;
  property_title: string;
}

export default function Rentals() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenancies, setTenancies] = useState<TenancyRelationship[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"active" | "ending_tenancy" | "archived">("active");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const session = await authService.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      if (mounted) setUserId(session.user.id);
      const isManagerResult = await checkIfManager(session.user.id, mounted);
      if (mounted) await fetchData(session.user.id, session.user.email || "", isManagerResult, mounted);
    };

    checkUser();
    return () => { mounted = false; };
  }, [navigate]);

  const checkIfManager = async (uid: string, mounted: boolean): Promise<boolean> => {
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("manager_id", uid)
      .limit(1);
    
    const isManagerResult = data && data.length > 0;
    if (mounted) setIsManager(isManagerResult);
    return isManagerResult;
  };

  const fetchData = async (uid: string, email: string, isManagerParam: boolean, mounted: boolean) => {
    if (!mounted) return;
    setLoading(true);
    try {
      await fetchTenantTenancies(uid);
      await fetchTenantInvitations(email);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const fetchTenantTenancies = async (tenantId: string) => {
    // Include archived tenancies
    const tenancies = await tenantService.getTenanciesByTenant(tenantId);

    const tenanciesWithDetails = await Promise.all(tenancies.map(async (t) => {
      const agreement = await tenancyService.getRentAgreementBasicInfo(t.propertyId, t.tenantId);

      return {
        id: t.id,
        property_id: t.propertyId,
        tenant_id: t.tenantId,
        property_title: t.propertyTitle,
        property_address: t.propertyAddress,
        tenant_name: "",
        tenant_email: "",
        rent_amount_cents: agreement?.rent_amount_cents || 0,
        currency: agreement?.currency || "eur",
        contract_start: agreement?.start_date || null,
        contract_end: agreement?.end_date || null,
        tenancy_status: t.status || '',
        last_payment_status: null,
      };
    }));

    setTenancies(tenanciesWithDetails);
  };

  const fetchTenantInvitations = async (email: string) => {
    const { data, error } = await supabase
      .from("invitations")
      .select(`
        id,
        property_id,
        email,
        status,
        created_at,
        properties (title)
      `)
      .eq("email", email)
      .eq("status", "pending");

    if (error) {
      toast.error(error.message);
      return;
    }

    setInvitations((data || []).map((inv: any) => ({
      id: inv.id,
      property_id: inv.property_id,
      email: inv.email,
      status: inv.status,
      created_at: inv.created_at,
      property_title: inv.properties?.title || "",
    })));
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Find the invitation to get property_id
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error("Invitation not found");

      // Create property_tenants record
      await tenancyService.createPropertyTenant({
        property_id: invitation.property_id,
        tenant_id: user.id,
        tenancy_status: 'active',
        started_at: new Date().toISOString(),
      });

      // Update invitation status
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          status: "accepted",
          invited_user_id: user.id,
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Update tenancy_requirements status to accepted
      if (invitation.email) {
        const { error: reqError } = await supabase
          .from("tenancy_requirements")
          .update({ status: "accepted" })
          .eq("property_id", invitation.property_id)
          .eq("tenant_email", invitation.email)
          .in("status", ["draft", "sent"]);
        if (reqError) console.error("Error updating requirement status:", reqError);
      }

      // Enforce FIFO tenancy limit
      await tenancyService.manageTenancyLimit({
        body: { property_id: invitation.property_id },
      });

      // Invalidate cache to refresh
      await queryClient.invalidateQueries({ 
        queryKey: [TENANT_PROPERTIES_QUERY_KEY] 
      });

      toast.success("Invitation accepted");
      
      // Refresh data
      if (userId && user.email) {
        await fetchData(userId, user.email, isManager);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    const symbols: Record<string, string> = { eur: "€", usd: "$", gbp: "£" };
    return `${symbols[currency] || currency.toUpperCase()} ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">{t("dashboard.active")}</Badge>;
      case "ending_tenancy":
        return <Badge variant="secondary">{t("properties.endingTenancy")}</Badge>;
      case "historic":
        return <Badge variant="outline">{t("rentals.archived")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter tenancies by current view
  const filteredTenancies = tenancies.filter((t) => {
    if (currentView === "active") return t.tenancy_status === "active";
    if (currentView === "ending_tenancy") return t.tenancy_status === "ending_tenancy";
    if (currentView === "archived") return t.tenancy_status === "historic";
    return true;
  });

  // Count tenancies by status
  const activeCount = tenancies.filter((t) => t.tenancy_status === "active").length;
  const endingCount = tenancies.filter((t) => t.tenancy_status === "ending_tenancy").length;
  const archivedCount = tenancies.filter((t) => t.tenancy_status === "historic").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Handshake className="h-8 w-8 text-primary" />
          {t("rentals.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("rentals.description")}</p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6">
        <ArchiveToggle
          activeCount={activeCount}
          endingTenancyCount={endingCount}
          archivedCount={archivedCount}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {/* Prominent Onboarding Checklist for Active Tenancies */}
      {!isManager && tenancies.filter(t => t.tenancy_status === 'active').length > 0 && (
        <div className="mb-6 space-y-4">
          {tenancies
            .filter(t => t.tenancy_status === 'active')
            .map((tenancy) => (
              <Card key={`onboarding-${tenancy.id}`} className="border-accent/50 bg-accent/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-accent" />
                    <CardTitle>{t('rentals.completeSetup')}</CardTitle>
                  </div>
                  <CardDescription>{tenancy.property_title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <TenantOnboardingChecklist
                    tenancyId={tenancy.id}
                    propertyId={tenancy.property_id}
                    onScrollToContract={() => navigate(`/properties/${tenancy.property_id}/tenants?tab=contracts`)}
                    onSwitchToPayments={() => navigate(`/properties/${tenancy.property_id}/tenants?tab=payments`)}
                  />
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {!isManager && invitations.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Pending Invitations
          </h2>
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="border-accent/50">
              <CardHeader>
                <CardTitle>{invitation.property_title}</CardTitle>
                <CardDescription>
                  Invited on {format(new Date(invitation.created_at), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={processingInvitation === invitation.id}
                  >
                    {processingInvitation === invitation.id ? "Processing..." : "Accept"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTenancies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Handshake className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {currentView === "active" && t("rentals.noActiveRentals")}
              {currentView === "ending_tenancy" && t("rentals.noEndingTenancies")}
              {currentView === "archived" && t("rentals.noArchivedTenancies")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {currentView === "active" && t("rentals.noActiveRentalsDesc")}
              {currentView === "ending_tenancy" && t("rentals.noEndingTenanciesDesc")}
              {currentView === "archived" && t("rentals.noArchivedTenanciesDesc")}
            </p>
            {isManager && currentView === "active" && (
              <p className="text-sm text-muted-foreground">
                {t("rentals.managerNoRentalsHint")}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTenancies.map((tenancy) => (
            <Card
              key={tenancy.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/properties/${tenancy.property_id}/tenants`, {
                state: {
                  tenancyId: tenancy.id,
                  tenancyStatus: tenancy.tenancy_status,
                  fromRentals: true
                }
              })}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {tenancy.property_title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {tenancy.property_address}
                    </CardDescription>
                  </div>
                  {getStatusBadge(tenancy.tenancy_status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {isManager && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{tenancy.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">{tenancy.tenant_email}</p>
                      </div>
                    </div>
                  )}
                  
                  {tenancy.rent_amount_cents > 0 && (
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {formatCurrency(tenancy.rent_amount_cents, tenancy.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">Monthly rent</p>
                      </div>
                    </div>
                  )}
                  
                  {tenancy.contract_start && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(tenancy.contract_start), "PP")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tenancy.contract_end ? `Until ${format(new Date(tenancy.contract_end), "PP")}` : "Ongoing"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
