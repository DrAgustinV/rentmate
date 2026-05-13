import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface ToastOptions {
  success?: {
    title?: string;
    description?: string;
  };
  error?: {
    title?: string;
    description?: string;
  };
  silent?: boolean;
}

interface UseMutationWithToastOptions<TData, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, unknown, TVariables, TContext>, 'onSuccess' | 'onError'> {
  toastOptions?: ToastOptions;
}

export function useMutationWithToast<TData, TVariables, TContext>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationWithToastOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { t } = useLanguage();

  const { onSuccess, onError, toastOptions, ...rest } = options || {};

  return useMutation<TData, unknown, TVariables, TContext>(mutationFn, {
    ...rest,
    onSuccess: (data, variables, context) => {
      if (!toastOptions?.silent) {
        toast.success(
          toastOptions?.success?.title || t('common.success'),
          { description: toastOptions?.success?.description }
        );
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!toastOptions?.silent) {
        toast.error(
          toastOptions?.error?.title || t('common.error'),
          { description: toastOptions?.error?.description || (error instanceof Error ? error.message : 'An error occurred') }
        );
      }
      onError?.(error, variables, context);
    },
  });
}
