import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  plan: string;
  plan_name: string;
  status: string;
  subscription_type: string;
  is_trial: boolean;
  trial_end: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
  features: {
    digital_signatures_per_year: number;
    automated_payments_enabled: boolean;
    kyc_verification_enabled: boolean;
    document_templates_enabled: boolean;
    white_labeling_enabled: boolean;
    api_access_enabled: boolean;
    advanced_analytics_enabled: boolean;
    stripe_connect_enabled: boolean;
    sepa_direct_debit_enabled: boolean;
    revolut_payments_enabled: boolean;
    recurring_tasks_enabled: boolean;
    maintenance_templates_enabled: boolean;
    repair_shop_directory_enabled: boolean;
    brand_customization_enabled: boolean;
    property_limit: number;
    kilt_kyc_enabled: boolean;
    government_id_kyc_enabled: boolean;
    government_id_verifications_per_year: number;
  };
  usage: {
    signatures_used: number;
    signatures_limit: number;
    remaining: number;
    overage: number;
  };
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

  const canUseFeature = (feature: keyof SubscriptionData['features']): boolean => {
    if (!data) return false;
    return data.features[feature] === true || (typeof data.features[feature] === 'number' && data.features[feature] > 0);
  };

  const canCreateSignature = (): { allowed: boolean; reason?: string } => {
    if (!data) {
      return { allowed: false, reason: "Loading subscription data..." };
    }

    if (data.plan === 'free') {
      return { allowed: false, reason: "Digital signatures require a Pro or Enterprise plan" };
    }

    if (data.usage.remaining <= 0) {
      return { allowed: false, reason: "You've reached your annual signature limit" };
    }

    return { allowed: true };
  };

  const canUseGovernmentIdKYC = (): boolean => {
    if (!data) return false;
    return data.features.government_id_kyc_enabled === true;
  };

  const canUseKiltKYC = (): boolean => {
    if (!data) return false;
    return data.features.kilt_kyc_enabled === true;
  };

  const getPropertyLimit = (): number => {
    if (!data) return 1; // Default to FREE limit
    return data.features.property_limit || 1;
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
    canUseGovernmentIdKYC,
    canUseKiltKYC,
    getPropertyLimit,
    refresh,
    isPro: data?.plan === 'pro' || data?.plan === 'enterprise',
    isFree: data?.plan === 'free',
    isEnterprise: data?.plan === 'enterprise',
  };
}
