import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
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

  const activeTenantWithProfile = useMemo(() => {
    if (!allTenants) return null;
    return allTenants.find(t => t.tenancy_status === 'active') || null;
  }, [allTenants]);

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
    onSuccess: async (result) => {
      showToast.success(t("dialogs.inviteTenant.sent"));
      refetchInvitations();
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
      
      // Update requirement status from draft → sent
      const { error: reqError } = await supabase
        .from("tenancy_requirements")
        .update({ status: "sent" })
        .eq("property_id", propertyId)
        .eq("tenant_email", result.email)
        .eq("status", "draft");
      if (reqError) console.error("Error updating requirement status:", reqError);
    },
    onError: (error: Error) => {
      const err = error as { errors?: Array<{ message: string }>; message?: string };
      if (err.errors?.[0]?.message) {
        showToast.error(t("common.validationError"));
      } else {
        showToast.error(t("common.error"));
      }
    },
  });

  const dismissInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "dismissed" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success(t('invitations.dismissSuccess'));
      refetchInvitations();
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('common.error'));
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
      showToast.success(t("dialogs.manageTenants.tenancyEnding"));
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: Error) => {
      showToast.error(t("common.error"));
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
      showToast.success(t("dialogs.manageTenants.tenancyFinalized"));
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: Error) => {
      showToast.error(t("common.error"));
    },
  });

  const undoFinalizeTenancyMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: tenant } = await supabase
        .from("property_tenants")
        .select("ended_at")
        .eq("id", tenantId)
        .single();

      if (!tenant?.ended_at) throw new Error("Cannot undo: tenancy was not finalized");

      const endedAt = new Date(tenant.ended_at);
      const hoursSinceEnd = (Date.now() - endedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceEnd > 24) throw new Error(t("dialogs.manageTenants.undoExpired") || "Undo window has expired (24 hours)");

      const { error } = await supabase
        .from("property_tenants")
        .update({ tenancy_status: "ending_tenancy", ended_at: null })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success(t("dialogs.manageTenants.undoFinalizeSuccess") || "Tenancy restored to ending");
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: Error) => {
      showToast.error(t("common.error"));
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success(t("dialogs.manageTenants.invitationCancelled"));
      refetchInvitations();
    },
    onError: (error: Error) => {
      showToast.error(t("common.error"));
    },
  });

  const deleteTenancyMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("property_tenants")
        .delete()
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success(t("dialogs.manageTenants.tenancyDeleted") || "Tenancy deleted");
      queryClient.invalidateQueries({ queryKey: ["all-tenants-basic", propertyId] });
    },
    onError: (error: Error) => {
      showToast.error(t("common.error"));
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
    undoFinalizeTenancyMutation,
    cancelInvitationMutation,
    deleteTenancyMutation,
  };
}
