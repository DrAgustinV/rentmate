import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type ToastDesc = string | ((error: unknown) => string);

interface ToastOptions {
  success?: {
    title?: string;
    description?: ToastDesc;
  };
  error?: {
    title?: string;
    description?: ToastDesc;
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
  const { toast } = useToast();
  const { t } = useLanguage();

  const { onSuccess, onError, toastOptions, ...rest } = options || {};

  return useMutation<TData, unknown, TVariables, TContext>(mutationFn, {
    ...rest,
    onSuccess: (data, variables, context) => {
      if (!toastOptions?.silent) {
        toast({
          title: toastOptions?.success?.title || t('common.success'),
          description: typeof toastOptions?.success?.description === 'function'
            ? toastOptions.success.description(data)
            : toastOptions?.success?.description,
        });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!toastOptions?.silent) {
        toast({
          title: toastOptions?.error?.title || t('common.error'),
          description: typeof toastOptions?.error?.description === 'function'
            ? toastOptions.error.description(error)
            : toastOptions?.error?.description || (error instanceof Error ? error.message : 'An error occurred'),
          variant: 'destructive',
        });
      }
      onError?.(error, variables, context);
    },
  });
}
