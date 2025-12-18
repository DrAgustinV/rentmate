import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { z } from "zod";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { ContractsTab } from '@/components/property-tenants/ContractsTab';
import { PaymentsTab } from '@/components/property-tenants/PaymentsTab';
import { TicketsTab } from '@/components/property-tenants/TicketsTab';
import { OverviewTab } from '@/components/property-hub/OverviewTab';
import { useTenancyRequirements, CreateTenancyRequirementInput, TenancyRequirement } from '@/hooks/useTenancyRequirements';
import { CreateTenancyWizard } from '@/components/CreateTenancyWizard';
import { EndTenancyDialog } from "@/components/EndTenancyDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { toast as sonnerToast } from 'sonner';

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const createInviteSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .email({ message: t("dialogs.inviteTenant.emailPlaceholder") }),
  });

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalyticsContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract navigation state
  const { tenancyId, tenancyStatus, fromRentals } = location.state || {};
  const isReadOnly = tenancyStatus === 'historic';

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';
  const actionParam = searchParams.get('action');
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  
  // Handle ?action=newTenancy URL param to auto-trigger wizard
  const [hasTriggeredAction, setHasTriggeredAction] = useState(false);

  // UI state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [showEndTenancyDialog, setShowEndTenancyDialog] = useState(false);
  const [endingTenant, setEndingTenant] = useState<Tenant | null>(null);
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  const [finalizingTenant, setFinalizingTenant] = useState<Tenant | null>(null);

  // Essential queries that are needed upfront
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: propertyData } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId)
        .single();
      return { isManager: propertyData?.manager_id === user.id };
    },
    enabled: !!propertyId,
  });

  // Query for active tenant with profile info (for Overview tab and shared logic)
  const { data: activeTenantWithProfile } = useQuery({
    queryKey: ["active-tenant-profile", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(`
          *,
          profiles!property_tenants_tenant_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq("property_id", propertyId)
        .eq("tenancy_status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  // Fetch active tenants for currentTenant logic (lightweight query)
  const { data: activeTenants } = useQuery({
    queryKey: ["active-tenants-basic", propertyId],
    queryFn: async () => {
      const { data: tenancies, error: tenanciesError } = await supabase
        .from("property_tenants")
        .select("id, tenant_id, tenancy_status, started_at, ended_at, planned_ending_date, notes")
        .eq("property_id", propertyId)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .order("started_at", { ascending: false });

      if (tenanciesError) throw tenanciesError;
      if (!tenancies || tenancies.length === 0) return [];

      const tenantIds = tenancies.map(t => t.tenant_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, avatar_url, kyc_status")
        .in("id", tenantIds);

      if (profilesError) throw profilesError;

      return tenancies.map((tenancy) => {
        const profile = profiles?.find(p => p.id === tenancy.tenant_id);
        return {
          ...tenancy,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          kyc_status: profile?.kyc_status || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  // Find focused tenant if tenancyId provided, otherwise get first active tenant
  const focusedTenant = activeTenants?.find((t) => t.id === tenancyId);
  const currentTenant = focusedTenant || (activeTenants && activeTenants.length > 0 ? activeTenants[0] : null);

  // Tenancy Requirements Hook
  const { createRequirement, requirements, deleteRequirement } = useTenancyRequirements(propertyId!);
  
  // Get first pending tenancy requirement (draft or sent status)
  const pendingRequirement = requirements?.find(r => r.status === 'draft' || r.status === 'sent') || null;

  // Compute tenancy setup state
  const canSetupNewTenancy = (!currentTenant || currentTenant?.tenancy_status === 'ending_tenancy') && !pendingRequirement;
  const hasEndingTenancy = currentTenant?.tenancy_status === 'ending_tenancy';

  // Auto-trigger wizard from URL action param
  useEffect(() => {
    if (actionParam === 'newTenancy' && canSetupNewTenancy && !hasTriggeredAction && !propertyLoading) {
      setShowTenancyWizard(true);
      setHasTriggeredAction(true);
      // Clear the action param from URL
      setSearchParams({ tab: 'contracts' });
    }
  }, [actionParam, canSetupNewTenancy, hasTriggeredAction, propertyLoading, setSearchParams]);

  // Query for invitations (needed for OverviewTab)
  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  // Query for contract templates (needed for wizard)
  const { data: templates } = useQuery({
    queryKey: ["contract-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("id, document_title")
        .eq("document_category", "template")
        .or(`property_id.eq.${propertyId},property_id.is.null`)
        .eq("is_latest_version", true)
        .order("document_title");
      if (error) throw error;
      return data as Array<{ id: string; document_title: string }>;
    },
    enabled: !!propertyId,
  });

  const handleWizardSubmit = async (data: CreateTenancyRequirementInput) => {
    try {
      await createRequirement.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
      setShowTenancyWizard(false);
      sonnerToast.success(t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. Send invitation when ready.');
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const inviteSchema = createInviteSchema(t);
      const data = inviteSchema.parse({ email });

      const { data: profiles } = await supabase.from("profiles").select("id").eq("email", data.email).maybeSingle();

      if (profiles) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId!)
          .eq("tenant_id", profiles.id)
          .maybeSingle();
        if (existing) throw new Error(t("dialogs.inviteTenant.alreadyTenant"));
      }

      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", data.email)
        .eq("property_id", propertyId!)
        .maybeSingle();

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      if (existingInvite) {
        if (existingInvite.status === "pending") {
          throw new Error(t("dialogs.inviteTenant.alreadyInvited"));
        }

        if (existingInvite.status === "cancelled" || existingInvite.status === "accepted") {
          const { error } = await supabase
            .from("invitations")
            .update({
              token,
              expires_at: expiresAt.toISOString(),
              status: "pending",
              invited_user_id: profiles?.id || null,
            })
            .eq("id", existingInvite.id);

          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("invitations").insert({
          token,
          email: data.email,
          property_id: propertyId,
          expires_at: expiresAt.toISOString(),
          invited_user_id: profiles?.id || null,
        });

        if (error) throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ""} ${managerProfile.last_name || ""}`.trim() || "Property Manager"
        : "Property Manager";

      await supabase.functions.invoke("send-tenant-invitation", {
        body: {
          email: data.email,
          propertyTitle: property?.title,
          propertyAddress: null,
          managerName,
          token,
          expiresAt: expiresAt.toISOString(),
          language: localStorage.getItem("language") || "en",
          projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
          propertyId: propertyId,
        },
      });
    },
    onSuccess: () => {
      trackEvent({
        event_name: 'tenant_invited',
        event_category: 'tenant_management',
        event_metadata: { property_id: propertyId },
      });
      
      toast({ title: t("dialogs.inviteTenant.sent"), description: t("dialogs.inviteTenant.sentDesc") });
      refetchInvitations();
    },
    onError: (error: any) => {
      if (error instanceof z.ZodError) {
        toast({ title: t("common.validationError"), description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
    },
  });

  const handleSendInvitation = async (requirement: TenancyRequirement) => {
    try {
      await inviteMutation.mutateAsync(requirement.tenant_email);
      
      const { data: invitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', requirement.tenant_email)
        .eq('property_id', propertyId)
        .eq('status', 'pending')
        .single();
      
      await supabase
        .from('tenancy_requirements')
        .update({ 
          status: 'sent',
          invitation_id: invitation?.id || null
        })
        .eq('id', requirement.id);
      
      queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['invitations', propertyId] });
      sonnerToast.success(t('tenancy.invitationSent') || 'Invitation sent to tenant');
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const handleCancelSetup = async (requirement: TenancyRequirement) => {
    try {
      if (requirement.invitation_id) {
        await supabase
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('id', requirement.invitation_id);
      } else {
        await supabase
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('property_id', propertyId)
          .eq('email', requirement.tenant_email)
          .eq('status', 'pending');
      }
      
      await deleteRequirement.mutateAsync(requirement.id);
      queryClient.invalidateQueries({ queryKey: ['invitations', propertyId] });
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const handleResendInvitation = async (requirement: TenancyRequirement) => {
    try {
      const { data: existingInvite, error: fetchError } = await supabase
        .from("invitations")
        .select("id, token, expires_at")
        .eq("email", requirement.tenant_email)
        .eq("property_id", propertyId!)
        .eq("status", "pending")
        .single();

      if (fetchError || !existingInvite) {
        throw new Error("Invitation not found");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ""} ${managerProfile.last_name || ""}`.trim() || "Property Manager"
        : "Property Manager";

      await supabase.functions.invoke("send-tenant-invitation", {
        body: {
          email: requirement.tenant_email,
          propertyTitle: property?.title,
          propertyAddress: null,
          managerName,
          token: existingInvite.token,
          expiresAt: existingInvite.expires_at,
          language: localStorage.getItem("language") || "en",
          projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
          propertyId: propertyId,
        },
      });

      sonnerToast.success(t('tenancy.invitationResent') || 'Invitation resent to tenant');
      queryClient.invalidateQueries({ queryKey: ['invitations', propertyId] });
    } catch (error: any) {
      console.error("Resend invitation error:", error);
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  // Tenancy mutations
  const endTenancyMutation = useMutation({
    mutationFn: async ({ tenantId, plannedEndDate }: { tenantId: string; plannedEndDate: string }) => {
      const { error } = await supabase
        .from("property_tenants")
        .update({
          tenancy_status: "ending_tenancy",
          planned_ending_date: plannedEndDate,
        })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.tenancyEnding") });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenants-basic", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-history", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenant-profile", propertyId] });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const finalizeTenancyMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("property_tenants")
        .update({
          tenancy_status: "historic",
          ended_at: new Date().toISOString(),
        })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.tenancyFinalized") });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenants-basic", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-history", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenant-profile", propertyId] });
      setFinalizingTenant(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.invitationCancelled") });
      refetchInvitations();
      setCancellingInvitation(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("properties.notFound")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          {fromRentals ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/rentals')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("rentals.backToRentals")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{t("propertyHub.subtitle")}</p>
          </div>
        </div>

        {/* Read-Only Warning for Archived Tenancies */}
        {isReadOnly && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("renting.archivedTenancy")}</AlertTitle>
            <AlertDescription>{t("renting.archivedWarning")}</AlertDescription>
          </Alert>
        )}

        {/* Property Name Header */}
        <h1 className="text-2xl font-bold">{property?.title}</h1>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t("propertyHub.overview")}</TabsTrigger>
            <TabsTrigger value="contracts">{t("propertyTenants.tabs.contracts")}</TabsTrigger>
            <TabsTrigger value="payments">{t("propertyTenants.tabs.payments")}</TabsTrigger>
            <TabsTrigger value="tickets">{t("propertyTenants.tabs.tickets")}</TabsTrigger>
          </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab
                  property={property}
                  propertyId={propertyId!}
                  userRole={userRole}
                  activeTenant={activeTenantWithProfile}
                  templates={templates}
                  invitations={invitations}
                  onInviteTenant={(email) => inviteMutation.mutate(email)}
                />
              </TabsContent>

              <TabsContent value="contracts" className="mt-6">
                <ContractsTab
                  currentTenant={currentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                  isReadOnly={isReadOnly}
                  pendingRequirement={pendingRequirement}
                  canSetupNewTenancy={canSetupNewTenancy}
                  hasEndingTenancy={hasEndingTenancy}
                  onStartSetup={() => setShowTenancyWizard(true)}
                  onSendInvitation={handleSendInvitation}
                  onCancelSetup={handleCancelSetup}
                  onResendInvitation={handleResendInvitation}
                  isDeleting={deleteRequirement.isPending}
                  isResending={inviteMutation.isPending}
                  onEditTenant={setEditingTenant}
                  onEndTenancy={(tenant) => {
                    setEndingTenant(tenant);
                    setShowEndTenancyDialog(true);
                  }}
                  onFinalizeTenancy={(tenant) => setFinalizingTenant(tenant)}
                  setCancellingInvitation={setCancellingInvitation}
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentsTab
                  currentTenant={currentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="tickets" className="mt-6">
                <TicketsTab propertyId={propertyId!} tenancyId={currentTenant?.id} />
              </TabsContent>

        </Tabs>
      </div>

      {/* End Tenancy Dialog with Date Picker */}
      <EndTenancyDialog
        open={showEndTenancyDialog}
        onOpenChange={(open) => {
          setShowEndTenancyDialog(open);
          if (!open) setEndingTenant(null);
        }}
        tenantName={endingTenant ? getTenantName(endingTenant) : ""}
        onConfirm={(plannedEndDate) => {
          if (endingTenant) {
            endTenancyMutation.mutate({ tenantId: endingTenant.id, plannedEndDate });
          }
          setShowEndTenancyDialog(false);
          setEndingTenant(null);
        }}
        isPending={endTenancyMutation.isPending}
      />

      {/* Finalize Tenancy Dialog */}
      <AlertDialog open={!!finalizingTenant} onOpenChange={() => setFinalizingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.finalizeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t("dialogs.manageTenants.finalizeMessage")} ${finalizingTenant && getTenantName(finalizingTenant)}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (finalizingTenant) {
                  finalizeTenancyMutation.mutate(finalizingTenant.id);
                }
              }}
            >
              {t("dialogs.manageTenants.finalize")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={() => setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.cancelInvitationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingInvitation &&
                `${t("dialogs.manageTenants.cancelInvitationDesc")} ${cancellingInvitation.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingInvitation && cancelInvitationMutation.mutate(cancellingInvitation.id)}
            >
              {t("dialogs.manageTenants.cancelInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tenant Dialog */}
      <EditTenantDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        propertyId={propertyId!}
        readOnly={isReadOnly}
      />

      {/* Tenancy Setup Wizard */}
      <CreateTenancyWizard
        open={showTenancyWizard}
        onOpenChange={setShowTenancyWizard}
        propertyId={propertyId!}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
      />
    </AppLayout>
  );
}
