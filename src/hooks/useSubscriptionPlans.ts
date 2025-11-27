import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Json } from "@/integrations/supabase/types";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  trial_days: number;
  grace_period_days: number;
  overage_price_per_signature_cents: number;
  feature_limits: Record<string, any>;
  features_display: Record<string, string[]>;
  limitations_display: Record<string, string[]>;
  is_available_for_signup: boolean;
  is_default: boolean;
  sort_order: number;
  status: string;
}

export interface LocalizedPlan extends SubscriptionPlan {
  localizedFeatures: string[];
  localizedLimitations: string[];
  isUsingFallback: boolean;
}

export function useSubscriptionPlans() {
  const { language } = useLanguage();

  const { data: plans, isLoading, error, refetch } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("status", "active")
        .order("sort_order");

      if (error) {
        console.error("Error fetching subscription plans:", error);
        throw error;
      }
      
      // Transform the data to ensure proper typing
      return (data || []).map(plan => ({
        ...plan,
        features_display: (plan.features_display as Record<string, string[]>) || {},
        limitations_display: (plan.limitations_display as Record<string, string[]>) || {},
        feature_limits: (plan.feature_limits as Record<string, any>) || {},
      })) as SubscriptionPlan[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  const getLocalizedFeatures = (plan: SubscriptionPlan): { features: string[]; isUsingFallback: boolean } => {
    const featuresDisplay = plan.features_display as Record<string, string[]> || {};
    
    // Try current language first
    if (featuresDisplay[language] && featuresDisplay[language].length > 0) {
      return { features: featuresDisplay[language], isUsingFallback: false };
    }
    
    // Fallback to English
    if (featuresDisplay['en'] && featuresDisplay['en'].length > 0) {
      return { features: featuresDisplay['en'], isUsingFallback: true };
    }
    
    // No translations available
    return { features: [], isUsingFallback: true };
  };

  const getLocalizedLimitations = (plan: SubscriptionPlan): string[] => {
    const limitationsDisplay = plan.limitations_display as Record<string, string[]> || {};
    
    // Try current language first
    if (limitationsDisplay[language] && limitationsDisplay[language].length > 0) {
      return limitationsDisplay[language];
    }
    
    // Fallback to English
    if (limitationsDisplay['en'] && limitationsDisplay['en'].length > 0) {
      return limitationsDisplay['en'];
    }
    
    return [];
  };

  // Transform plans with localized content
  const localizedPlans: LocalizedPlan[] | undefined = plans?.map((plan) => {
    const { features, isUsingFallback } = getLocalizedFeatures(plan);
    const limitations = getLocalizedLimitations(plan);
    
    return {
      ...plan,
      localizedFeatures: features,
      localizedLimitations: limitations,
      isUsingFallback,
    };
  });

  // Get translation status for a plan
  const getTranslationStatus = (plan: SubscriptionPlan, langCode: string): boolean => {
    const featuresDisplay = plan.features_display as Record<string, string[]> || {};
    return featuresDisplay[langCode] && featuresDisplay[langCode].length > 0;
  };

  return {
    plans: localizedPlans,
    rawPlans: plans,
    isLoading,
    error,
    refetch,
    getLocalizedFeatures,
    getLocalizedLimitations,
    getTranslationStatus,
    currentLanguage: language,
  };
}
