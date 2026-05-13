import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface StandardMutationOptions<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: unknown, variables: TVariables, context: TContext) => void;
  
  successToast?: string | false;
  errorToast?: string | false;
  trackEvent?: boolean;
  eventName?: string;
  silent?: boolean;
}

export function useStandardMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
  options: StandardMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();

  const { 
    mutationFn, 
    onSuccess: originalOnSuccess, 
    onError: originalOnError, 
    successToast, 
    errorToast, 
    trackEvent: shouldTrack, 
    eventName, 
    silent,
    ...restOptions 
  } = options;

  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn,
    ...restOptions,
    onSuccess: (data, variables, context) => {
      if (!silent) {
        if (successToast !== false) {
          toast.success(successToast || t('common.success') || 'Success');
        }
      }
      if (shouldTrack && eventName) {
        trackEvent?.({
          eventName,
          category: 'mutation',
          metadata: { variables, data },
        });
      }
      originalOnSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!silent) {
        if (errorToast !== false) {
          toast.error(errorToast || t('common.error') || 'An error occurred');
        }
      }
      originalOnError?.(error, variables, context);
    },
  });
}
