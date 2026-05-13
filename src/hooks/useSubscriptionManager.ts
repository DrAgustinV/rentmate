import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useSubscriptionManager() {
  const { t } = useLanguage();
  const { subscription, isLoading, refresh } = useSubscription();

  const createCheckout = useMutation({
    mutationFn: async (billingPeriod: 'monthly' | 'annual') => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('common.notAuthenticated'));

      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { planSlug: 'pro', billingPeriod },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success(t('subscription.toasts.openingCheckout'));
        setTimeout(() => refresh(), 5000);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || t('subscription.toasts.checkoutFailed'));
    },
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('common.notAuthenticated'));

      const { data, error } = await supabase.functions.invoke('customer-portal-session', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success(t('subscription.toasts.openingPortal'));
      }
    },
    onError: (error: any) => {
      toast.error(error.message || t('subscription.toasts.portalFailed'));
    },
  });

  const isPro = subscription?.plan === 'pro';
  const isEnterprise = subscription?.plan === 'enterprise';
  const isFree = subscription?.plan === 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const signaturesPercent = subscription?.usage?.signatures_used && subscription?.features?.digital_signatures_per_year
    ? (subscription.usage.signatures_used / subscription.features.digital_signatures_per_year) * 100
    : 0;

  return {
    subscription,
    isLoading,
    refresh,
    createCheckout,
    openPortal,
    isPro,
    isEnterprise,
    isFree,
    isActive,
    signaturesPercent,
    format,
  };
}
