import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
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
import {
  AlertTriangle,
  History,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { z } from "zod";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { ContractsTab } from '@/components/property-tenants/ContractsTab';
import { PaymentsTab } from '@/components/property-tenants/PaymentsTab';
import { TicketsTab } from '@/components/property-tenants/TicketsTab';
import { HistoricTab } from '@/components/property-tenants/HistoricTab';
import { useTenancyRequirements, CreateTenancyRequirementInput, TenancyRequirement } from '@/hooks/useTenancyRequirements';
import { CreateTenancyWizard } from '@/components/CreateTenancyWizard';
import { EndTenancyDialog } from "@/components/EndTenancyDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { TenantSwitcher } from "@/components/property-hub/TenantSwitcher";
import { PropertySwitcher } from "@/components/property-hub/PropertySwitcher";
import { showToast } from "@/lib/toast";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
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
  decline_reason?: string | null;
  declined_at?: string | null;
  tenancy_requirements_id?: string | null;
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
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalyticsContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract navigation state
  const { tenancyId, tenancyStatus } = location.state || {};
  const isReadOnly = tenancyStatus === 'historic';

  // Get active tab from URL or default to 'contracts'
  const activeTab = searchParams.get('tab') || 'contracts';
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
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [dismissingInvitation, setDismissingInvitation] = useState<Invitation | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [wizardInitialData, setWizardInitialData] = useState<TenancyRequirement | null>(null);
  const [wizardMode, setWizardMode] = useState<'new' | 'edit' | 'invite' | 'next_tenancy'>('new');

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

  // Fetch all tenants including historic and pending for switcher (lightweight query)
  const { data: allTenants } = useQuery({
    queryKey: ["all-tenants-basic", propertyId],
    queryFn: async () => {
      const { data: tenancies, error: tenanciesError } = await supabase
        .from("property_tenants")
        .select("id, tenant_id, tenancy_status, started_at, ended_at, planned_ending_date, notes")
        .eq("property_id", propertyId)
        .in("tenancy_status", ["active", "ending_tenancy", "historic", "pending"])
        .order("started_at", { ascending: false });

      if (tenanciesError) throw tenanciesError;
      if (!tenancies || tenancies.length === 0) return [];

      // Get tenant IDs where tenant_id is not null
      const tenantIds = tenancies
        .filter(t => t.tenant_id)
        .map(t => t.tenant_id);

      let profiles: Record<string, any> = {};

      // Fetch profiles only if there are valid tenantIds
      if (tenantIds.length > 0) {
        try {
          const { data: profileData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name, avatar_url, kyc_status")
            .in("id", tenantIds);

          if (!profilesError && profileData) {
            profileData.forEach(p => {
              profiles[p.id] = p;
            });
          }
        } catch (e) {
          // Continue without profiles if error
          console.warn("Could not fetch profiles:", e);
        }
      }

      return tenancies.map((tenancy) => {
        const profile = tenancy.tenant_id ? profiles[tenancy.tenant_id] : null;
        
        // For pending tenancies, extract email from notes
        let email = "Unknown";
        if (tenancy.tenancy_status === 'pending' && tenancy.notes) {
          const match = tenancy.notes.match(/sent to (.+@.+)/);
          email = match ? match[1] : "Pending";
        } else if (profile?.email) {
          email = profile.email;
        }
        
        return {
          ...tenancy,
          email,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          kyc_status: profile?.kyc_status || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  // Find focused tenant if tenancyId provided, otherwise use selected tenant or first active tenant
  const focusedTenant = allTenants?.find((t) => t.id === tenancyId);
  const selectedTenant = allTenants?.find((t) => t.id === selectedTenantId);
  // Prefer active/ending/pending tenants over historic for initial selection
  const selectableTenants = allTenants?.filter(t => t.tenancy_status !== 'historic') || [];
  const currentTenant = focusedTenant || selectedTenant || (selectableTenants.length > 0 ? selectableTenants[0] : null);

  // Check if viewing historic tenancy (for read-only mode)
  const isHistoricView = currentTenant?.tenancy_status === 'historic';

  // Auto-select first non-historic tenant when tenants load
  useEffect(() => {
    if (allTenants && allTenants.length > 0 && !selectedTenantId) {
      const firstNonHistoric = allTenants.find(t => t.tenancy_status !== 'historic');
      // Only set if we have a valid tenant with an id
      if (firstNonHistoric?.id) {
        setSelectedTenantId(firstNonHistoric.id);
      }
    }
  }, [allTenants, selectedTenantId]);

  // Ensure currentTenant always has at least an id even for pending
  const safeCurrentTenant = currentTenant ? {
    ...currentTenant,
    id: currentTenant.id || '',
    email: currentTenant.email || 'Pending',
    first_name: currentTenant.first_name ?? null,
    last_name: currentTenant.last_name ?? null,
  } : null;

  // Check if we should show the tenant switcher (multiple tenants including historic)
  // Always show tenant switcher when there are tenants for discoverability

  // Tenancy Requirements Hook
  const { createRequirement, requirements, deleteRequirement } = useTenancyRequirements(propertyId!);
  
  // Get first pending tenancy requirement (draft or sent status)
  const pendingRequirement = requirements?.find(r => r.status === 'draft' || r.status === 'sent') || null;

  // Compute tenancy setup state
  // Allow new tenancy setup if: no current tenant, or current is ending_tenancy, or current is pending (meaning tenant hasn't accepted yet)
  const canSetupNewTenancy = (!currentTenant || 
    currentTenant?.tenancy_status === 'ending_tenancy' || 
    currentTenant?.tenancy_status === 'pending') && !pendingRequirement;
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

  const handleWizardSubmit = async (data: CreateTenancyRequirementInput, mode: 'new' | 'edit' | 'invite' | 'next_tenancy') => {
    try {
      // Block editing if tenancy is ending or pending
      if (mode === 'edit' && (currentTenant?.tenancy_status === 'ending_tenancy' || currentTenant?.tenancy_status === 'pending')) {
        showToast.error({ title: t('tenancy.cannotEditActiveTenancy') || 'Cannot edit rental terms for this tenancy. Please set up a new tenancy instead.' });
        return;
      }

      // Check if we're editing existing requirements (wizardInitialData has ID)
      if (wizardInitialData?.id && mode === 'edit') {
        const { error: updateError } = await supabase
          .from('tenancy_requirements')
          .update({
            rent_amount_cents: data.rent_amount_cents,
            currency: data.currency,
            security_deposit_cents: data.security_deposit_cents,
            payment_day: data.payment_day,
            start_date: data.start_date,
            end_date: data.end_date,
            utilities_config: data.utilities_config as any,
          })
          .eq('id', wizardInitialData.id);
        
        if (updateError) throw updateError;
        
        queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Rental terms updated successfully.' });
        setShowTenancyWizard(false);
        setWizardInitialData(null);
        return;
      }
      
      const requirement = await createRequirement.mutateAsync(data);
      
      // Case 1: Self-manage only + NO email → create active tenancy (self-management)
      if (data.self_manage_only && !data.tenant_email) {
        const { error: tenancyError } = await supabase
          .from('property_tenants')
          .insert({
            property_id: propertyId,
            tenancy_status: 'active',
            started_at: new Date().toISOString(),
            notes: 'Self-managed tenancy (no tenant)',
          });
        
        if (tenancyError) {
          console.error('Error creating self-managed tenancy:', tenancyError);
        }
        
        queryClient.invalidateQueries({ queryKey: ['all-tenants-basic', propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. You can now manage contracts, tickets, and payments.' });
      } 
      // Case 2: Self-manage only + email provided → create pending tenancy AND send invitation
      else if (data.self_manage_only && data.tenant_email) {
        // Create pending tenancy - omit tenant_id entirely to allow null
        const { error: tenancyError } = await supabase
          .from('property_tenants')
          .insert({
            property_id: propertyId,
            tenancy_status: 'pending',
            started_at: new Date().toISOString(),
            notes: `Pending invitation sent to ${data.tenant_email}`,
          });
        
        if (tenancyError) {
          console.error('Error creating pending tenancy:', tenancyError);
        }
        
        queryClient.invalidateQueries({ queryKey: ['all-tenants-basic', propertyId] });
        queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
        showToast.success({ title: t('tenancy.invitationSent') || 'Invitation sent. You can now manage contracts, tickets, and payments while waiting for tenant.' });
      }
      // Case 3: Not self-manage → standard flow (create requirement, send invitation later)
      else {
        queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
        showToast.success({ title: t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. Send invitation when ready.' });
      }
      
      setShowTenancyWizard(false);
      setEditingInvitation(null);
      setWizardInitialData(null);
      setWizardMode('new');
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
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
          property_id: propertyId!,
          expires_at: expiresAt.toISOString(),
          status: "pending",
          invited_user_id: profiles?.id || null,
        });

        if (error) throw error;
      }

      return { email: data.email };
    },
    onSuccess: () => {
      showToast.success({ title: t("dialogs.inviteTenant.sent"), description: t("dialogs.inviteTenant.sentDesc") });
      refetchInvitations();
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: any) => {
      if (error.errors) {
        showToast.error({ title: t("common.validationError"), description: error.errors[0].message });
      } else {
        showToast.error({ title: t("common.error"), description: error.message });
      }
    },
  });

  const handleSendInvitation = async (email: string) => {
    try {
      await inviteMutation.mutateAsync(email);
      showToast.success({ title: t('tenancy.invitationSent') || 'Invitation sent to tenant' });
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleCancelSetup = async () => {
    if (!pendingRequirement) return;
    try {
      await deleteRequirement.mutateAsync(pendingRequirement.id);
      queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", invitationId);

      if (error) throw error;

      showToast.success({ title: t('tenancy.invitationResent') || 'Invitation resent to tenant' });
      refetchInvitations();
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const handleEditAndResend = async (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setWizardMode('edit');
    setShowTenancyWizard(true);
    setWizardInitialData({
      id: invitation.tenancy_requirements_id || undefined,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      utilities_config: {},
      self_manage_only: false,
      tenant_email: invitation.email,
    });
  };

  const handleWizardSubmitWithResend = async (data: CreateTenancyRequirementInput) => {
    if (!editingInvitation) return;
    try {
      const { error } = await supabase
        .from("invitations")
        .update({
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", editingInvitation.id);

      if (error) throw error;

      await handleWizardSubmit(data, 'edit');
    } catch (error: any) {
      showToast.error({ title: error.message || t('common.error') });
    }
  };

  const dismissInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "dismissed" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success({ title: t('invitations.dismissSuccess') });
      refetchInvitations();
    },
    onError: (error: any) => {
      showToast.error({ title: error.message || t('common.error') });
    },
  });

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
      showToast.success({ title: t("dialogs.manageTenants.tenancyEnding") });
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: any) => {
      showToast.error({ title: t("common.error"), description: error.message });
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
      showToast.success({ title: t("dialogs.manageTenants.tenancyFinalized") });
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: any) => {
      showToast.error({ title: t("common.error"), description: error.message });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success({ title: t("dialogs.manageTenants.invitationCancelled") });
      refetchInvitations();
    },
    onError: (error: any) => {
      showToast.error({ title: t("common.error"), description: error.message });
    },
  });

  const handleEditRentalTerms = (tenant: Tenant) => {
    setWizardMode('edit');
    setWizardInitialData({
      id: tenant.id,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: tenant.started_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      end_date: tenant.ended_at?.split('T')[0] || '',
      utilities_config: {},
      self_manage_only: false,
      tenant_email: tenant.email,
    });
    setShowTenancyWizard(true);
  };

  const handleInviteInSelfManaged = (tenant: Tenant) => {
    setWizardMode('invite');
    setWizardInitialData({
      id: tenant.id,
      rent_amount_cents: 0,
      currency: 'USD',
      security_deposit_cents: 0,
      payment_day: 1,
      start_date: tenant.started_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      end_date: tenant.ended_at?.split('T')[0] || '',
      utilities_config: {},
      self_manage_only: true,
      tenant_email: tenant.email,
    });
    setShowTenancyWizard(true);
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.tenancy_status === 'pending') return tenant.email;
    return `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenant.email;
  };

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-48" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          
          <PropertySwitcher currentPropertyId={propertyId!} />
        </div>

        {/* Historic Tenancy Read-Only Banner */}
        {isHistoricView && (
          <Alert variant="default" className="border-muted-foreground/30 bg-muted/30">
            <History className="h-4 w-4" />
            <AlertTitle className="text-muted-foreground">{t("tenancy.viewingHistoric")}</AlertTitle>
          </Alert>
        )}

        {/* Tenant Switcher for Multiple Tenants */}
        {userRole?.isManager && allTenants && allTenants.length > 0 && currentTenant && (
          <TenantSwitcher
            tenants={allTenants}
            selectedTenantId={currentTenant.id}
            onSelectTenant={setSelectedTenantId}
            onViewHistoric={() => setActiveTab('historic')}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contracts">{t("propertyTenants.tabs.contracts")}</TabsTrigger>
            <TabsTrigger value="payments">{t("propertyTenants.tabs.payments")}</TabsTrigger>
            <TabsTrigger value="tickets">{t("propertyTenants.tabs.tickets")}</TabsTrigger>
            <TabsTrigger value="historic">{t("propertyTenants.tabs.historic")}</TabsTrigger>
          </TabsList>

              <TabsContent value="contracts" className="mt-6">
                <ContractsTab
                  currentTenant={safeCurrentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                  isReadOnly={isReadOnly}
                  pendingRequirement={pendingRequirement}
                  canSetupNewTenancy={canSetupNewTenancy}
                  hasEndingTenancy={hasEndingTenancy}
                  onStartSetup={() => { setWizardMode('new'); setShowTenancyWizard(true); }}
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
                  onEditAndResend={handleEditAndResend}
                  onDismissInvitation={setDismissingInvitation}
                  isDismissing={dismissInvitationMutation.isPending}
                  onEditRentalTerms={handleEditRentalTerms}
                  onInviteInSelfManaged={handleInviteInSelfManaged}
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentsTab
                  currentTenant={safeCurrentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="tickets" className="mt-6">
                <TicketsTab propertyId={propertyId!} tenancyId={safeCurrentTenant?.id} isManager={userRole?.isManager} />
              </TabsContent>

              <TabsContent value="historic" className="mt-6">
                <HistoricTab propertyId={propertyId!} isManager={userRole?.isManager || false} />
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
        canEndImmediately={!!endingTenant && (!endingTenant.tenant_id || endingTenant.tenancy_status === 'pending')}
        onConfirm={async (plannedEndDate, mode) => {
          if (endingTenant) {
            if (mode === 'finalize') {
              await finalizeTenancyMutation.mutateAsync(endingTenant.id);
            } else {
              await endTenancyMutation.mutateAsync({ tenantId: endingTenant.id, plannedEndDate });
            }
          }
          setShowEndTenancyDialog(false);
          setEndingTenant(null);
        }}
        isPending={endTenancyMutation.isPending || finalizeTenancyMutation.isPending}
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
        onOpenChange={(open) => {
          setShowTenancyWizard(open);
          if (!open) {
            setEditingInvitation(null);
            setWizardInitialData(null);
            setWizardMode('new');
          }
        }}
        propertyId={propertyId!}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={editingInvitation ? handleWizardSubmitWithResend : handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
        initialData={wizardInitialData}
        mode={wizardMode}
      />

      {/* Dismiss Invitation Dialog */}
      <AlertDialog open={!!dismissingInvitation} onOpenChange={() => setDismissingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("invitations.dismissDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("invitations.dismissDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dismissingInvitation && dismissInvitationMutation.mutate(dismissingInvitation)}
            >
              {t("invitations.dismissDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
