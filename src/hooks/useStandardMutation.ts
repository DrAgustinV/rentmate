import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";

interface StandardMutationOptions<TData, TVariables, TError = Error> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  
  /** Toggle success toast (defaults to true) */
  showSuccessToast?: boolean;
  successToastTitle?: string;
  successToastDescription?: string;
  
  /** Toggle error toast (defaults to true) */
  showErrorToast?: boolean;
  errorToastTitle?: string;
  errorToastDescription?: string;
  
  /** Custom analytics tracking for success */
  trackSuccessEvent?: (data: TData, variables: TVariables) => void;
  /** Custom analytics tracking for error */
  trackErrorEvent?: (error: TError, variables: TVariables) => void;
  
  /** Automatically invalidate these query keys on success */
  invalidateQueries?: string[][];
}

export function useStandardMutation<TData, TVariables, TError = Error>(
  options: StandardMutationOptions<TData, TVariables, TError>
): UseMutationResult<TData, TError, TVariables> {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { trackEvent } = useAnalyticsContext();

  const defaultSuccessToastTitle = t('common.success');
  const defaultSuccessToastDescription = t('common.successMessage');
  const defaultErrorToastTitle = t('common.error');
  const defaultErrorToastDescription = t('common.errorMessage');

  return useMutation<TData, TError, TVariables>({
    mutationFn: options.mutationFn,
    onSuccess: (data, variables) => {
      if (options.showSuccessToast !== false) {
        toast({
          title: options.successToastTitle || defaultSuccessToastTitle,
          description: options.successToastDescription || defaultSuccessToastDescription,
        });
      }
      if (options.trackSuccessEvent) {
        options.trackSuccessEvent(data, variables);
      }
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      if (options.showErrorToast !== false) {
        toast({
          title: options.errorToastTitle || defaultErrorToastTitle,
          description: options.errorToastDescription || defaultErrorToastDescription,
          variant: "destructive",
        });
      }
      if (options.trackErrorEvent) {
        options.trackErrorEvent(error, variables);
      }
      options.onError?.(error, variables);
    },
  });
}
