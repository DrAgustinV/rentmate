import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService, tenantService, profileService, propertyService, documentService } from "@/services";
import { useLanguage } from "@/contexts/LanguageContext";
import { showToast } from "@/lib/toastUtils";
import { useTenancyRequirements } from "@/hooks/useTenancyRequirements";

export interface Tenant {
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
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function usePropertyTenantsData(propertyId: string | undefined, t: (key: string) => string) {
  const queryClient = useQueryClient();

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => propertyService.getProperty(propertyId),
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
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

  const { data: activeTenantWithProfile } = useQuery({
    queryKey: ["active-tenant-profile", propertyId],
    queryFn: async () => {
      const data = await tenantService.getActiveTenancyForProperty(propertyId!);
      if (!data) return null;
      return {
        id: data.id,
        tenant_id: data.tenantId,
        tenancy_status: data.status as Tenant['tenancy_status'],
        started_at: data.startDate,
        ended_at: data.endedAt,
        planned_ending_date: data.plannedEndDate,
        email: data.tenantEmail,
        first_name: data.tenantFirstName,
        last_name: data.tenantLastName,
        notes: data.notes,
        avatar_url: null,
        kyc_status: null,
        profiles: {
          first_name: data.tenantFirstName,
          last_name: data.tenantLastName,
          email: data.tenantEmail,
        }
      };
    },
    enabled: !!propertyId,
  });

  const { data: allTenants } = useQuery({
    queryKey: ["all-tenants-basic", propertyId],
    queryFn: async () => {
      const tenancies = await tenantService.getTenanciesByProperty(propertyId!);
      return tenancies.map(t => ({
        ...t,
        email: t.tenantEmail,
        first_name: t.tenantFirstName,
        last_name: t.tenantLastName,
        avatar_url: null,
        kyc_status: null,
      })) as Tenant[];
    },
    enabled: !!propertyId,
  });

  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const data = await tenantService.getInvitationsByProperty(propertyId!, { status: 'pending' });
      return data as Invitation[];
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  const { data: templates } = useQuery({
    queryKey: ["contract-templates", propertyId],
    queryFn: () => documentService.getTemplatesByProperty(propertyId!),
    enabled: !!propertyId,
  });

  const { createRequirement, requirements, deleteRequirement } = useTenancyRequirements(propertyId!);

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const profile = await profileService.getProfileByEmail(email);

      if (profile) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId!)
          .eq("tenant_id", profile.id)
          .maybeSingle();
        if (existing) throw new Error(t("dialogs.inviteTenant.alreadyTenant"));
      }

      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", email)
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
              invited_user_id: profile?.id || null,
            })
            .eq("id", existingInvite.id);
          if (error) throw error;
        }
      } else {
        await tenantService.createInvitation({
          token,
          email,
          property_id: propertyId!,
          expires_at: expiresAt.toISOString(),
          status: "pending",
          invited_user_id: profile?.id || null,
        });
      }

      return { email };
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

  const dismissInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "dismissed" }).eq("id", invitationId);
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
        .update({ tenancy_status: "ending_tenancy", planned_ending_date: plannedEndDate })
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
        .update({ tenancy_status: "historic", ended_at: new Date().toISOString() })
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
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);
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

  return {
    property, propertyLoading,
    userRole,
    activeTenantWithProfile,
    allTenants,
    invitations, refetchInvitations,
    templates,
    createRequirement, requirements, deleteRequirement,
    inviteMutation,
    dismissInvitationMutation,
    endTenancyMutation,
    finalizeTenancyMutation,
    cancelInvitationMutation,
  };
}
