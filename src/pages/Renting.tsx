import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, Building, Users, Calendar, DollarSign, Mail, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { toast } from "sonner";

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

export default function Renting() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenancies, setTenancies] = useState<TenancyRelationship[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await checkIfManager(session.user.id);
      await fetchData(session.user.id, session.user.email || "");
    };

    checkUser();
  }, [navigate]);

  const checkIfManager = async (uid: string) => {
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("manager_id", uid)
      .limit(1);
    
    setIsManager(data && data.length > 0);
  };

  const fetchData = async (uid: string, email: string) => {
    setLoading(true);
    try {
      if (isManager) {
        await fetchManagerTenancies(uid);
      } else {
        await fetchTenantTenancies(uid);
        await fetchTenantInvitations(email);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerTenancies = async (managerId: string) => {
    const { data, error } = await supabase
      .from("property_tenants")
      .select(`
        id,
        property_id,
        tenant_id,
        tenancy_status,
        started_at,
        ended_at,
        properties!inner (
          title,
          address,
          manager_id
        ),
        profiles!property_tenants_tenant_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq("properties.manager_id", managerId);

    if (error) {
      toast.error(error.message);
      return;
    }

    const tenanciesWithDetails = await Promise.all((data || []).map(async (t: any) => {
      const { data: agreement } = await supabase
        .from("rent_agreements")
        .select("rent_amount_cents, currency, start_date, end_date")
        .eq("property_id", t.property_id)
        .eq("tenant_id", t.tenant_id)
        .maybeSingle();

      const { data: lastPayment } = await supabase
        .from("rent_payments")
        .select("status")
        .eq("property_id", t.property_id)
        .eq("tenant_id", t.tenant_id)
        .order("payment_due_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: t.id,
        property_id: t.property_id,
        tenant_id: t.tenant_id,
        property_title: t.properties?.title || "",
        property_address: t.properties?.address || "",
        tenant_name: `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim() || t.profiles?.email || "",
        tenant_email: t.profiles?.email || "",
        rent_amount_cents: agreement?.rent_amount_cents || 0,
        currency: agreement?.currency || "eur",
        contract_start: agreement?.start_date || null,
        contract_end: agreement?.end_date || null,
        tenancy_status: t.tenancy_status,
        last_payment_status: lastPayment?.status || null,
      };
    }));

    setTenancies(tenanciesWithDetails);
  };

  const fetchTenantTenancies = async (tenantId: string) => {
    const { data, error } = await supabase
      .from("property_tenants")
      .select(`
        id,
        property_id,
        tenant_id,
        tenancy_status,
        properties (
          title,
          address
        )
      `)
      .eq("tenant_id", tenantId)
      .in("tenancy_status", ["active", "ending_tenancy"]);

    if (error) {
      toast.error(error.message);
      return;
    }

    const tenanciesWithDetails = await Promise.all((data || []).map(async (t: any) => {
      const { data: agreement } = await supabase
        .from("rent_agreements")
        .select("rent_amount_cents, currency, start_date, end_date")
        .eq("property_id", t.property_id)
        .eq("tenant_id", t.tenant_id)
        .maybeSingle();

      return {
        id: t.id,
        property_id: t.property_id,
        tenant_id: t.tenant_id,
        property_title: t.properties?.title || "",
        property_address: t.properties?.address || "",
        tenant_name: "",
        tenant_email: "",
        rent_amount_cents: agreement?.rent_amount_cents || 0,
        currency: agreement?.currency || "eur",
        contract_start: agreement?.start_date || null,
        contract_end: agreement?.end_date || null,
        tenancy_status: t.tenancy_status,
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
      const { error } = await supabase
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation accepted");
      if (userId) {
        await fetchData(userId, "");
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
        return <Badge variant="default">Active</Badge>;
      case "ending_tenancy":
        return <Badge variant="secondary">Ending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
          {t("renting.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("renting.description")}</p>
      </div>

      {!isManager && invitations.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Pending Invitations
          </h2>
          {invitations.map((invitation) => (
            <Card key={invitation.id} className="border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg">{invitation.property_title}</CardTitle>
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

      {tenancies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Handshake className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {isManager ? "No Active Tenancies" : "No Active Rentings"}
            </h3>
            <p className="text-muted-foreground">
              {isManager
                ? "You don't have any active tenancy relationships yet"
                : "You don't have any active rentings yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tenancies.map((tenancy) => (
            <Card
              key={tenancy.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/properties/${tenancy.property_id}/details`)}
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
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
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
