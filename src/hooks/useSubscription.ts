import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  subscribed: boolean;
  plan_name: string;
  plan_slug: string;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  grace_period_ends_at: string | null;
  feature_limits: {
    max_properties: number;
    max_tenancies_per_property: number;
    digital_signatures_per_year: number;
    automated_payments: boolean;
    kyc_verification: boolean;
    document_templates: boolean;
    white_labeling: boolean;
    api_access: boolean;
    advanced_analytics: boolean;
  };
  signatures_used: number;
  signatures_remaining: number;
}

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<SubscriptionData>({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("check-subscription-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 300000, // Auto-refetch every 5 minutes
    refetchOnWindowFocus: true,
  });

  const canUseFeature = (feature: keyof SubscriptionData['feature_limits']): boolean => {
    if (!data) return false;
    return data.feature_limits[feature] === true || (typeof data.feature_limits[feature] === 'number' && data.feature_limits[feature] > 0);
  };

  const canCreateSignature = (): { allowed: boolean; reason?: string } => {
    if (!data) {
      return { allowed: false, reason: "Loading subscription data..." };
    }

    if (data.plan_slug === 'free') {
      return { allowed: false, reason: "Digital signatures require a Pro or Enterprise plan" };
    }

    if (data.signatures_remaining <= 0) {
      return { allowed: false, reason: "You've reached your annual signature limit" };
    }

    return { allowed: true };
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    await refetch();
  };

  return {
    subscription: data,
    isLoading,
    error,
    canUseFeature,
    canCreateSignature,
    refresh,
    isPro: data?.plan_slug === 'pro' || data?.plan_slug === 'enterprise',
    isFree: data?.plan_slug === 'free',
    isEnterprise: data?.plan_slug === 'enterprise',
  };
}
