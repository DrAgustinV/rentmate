import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export type MutationNotificationMode = 'toast' | 'silent';

export interface UseMutationHandlerOptions<TData, TVariables> {
  onSuccessMessage?: string | ((variables: TVariables) => string);
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
}

/**
 * A wrapper around React Query's useMutation that standardizes success/error/silent patterns.
 * Provides `mutateSilent` and `mutateWithToast` methods for consistent notification handling.
 * 
 * Note: Uses `sonner` for toasts. Replace with `react-hot-toast` or `react-toastify` if your project uses a different library.
 */
export function useMutationHandler<TData, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationHandlerOptions<TData, TVariables>
) {
  const mutation = useMutation<TData, unknown, TVariables, TContext>({
    mutationFn,
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  const getSuccessMessage = (variables: TVariables) =>
    typeof options?.onSuccessMessage === 'function'
      ? options.onSuccessMessage(variables)
      : options?.onSuccessMessage || 'Operation successful';

  const getErrorMessage = (error: unknown) =>
    typeof options?.errorMessage === 'function'
      ? options.errorMessage(error)
      : options?.errorMessage || 'Operation failed';

  const mutateSilent = (variables: TVariables, mutationOptions?: { onSuccess?: () => void; onError?: () => void }) => {
    mutation.mutate(variables, {
      onSuccess: (data, vars) => {
        mutationOptions?.onSuccess?.();
        options?.onSuccess?.(data, vars);
      },
      onError: (error, vars) => {
        mutationOptions?.onError?.();
        options?.onError?.(error, vars);
      },
    });
  };

  const mutateWithToast = (variables: TVariables, mutationOptions?: { onSuccess?: () => void; onError?: () => void }) => {
    mutation.mutate(variables, {
      onSuccess: (data, vars) => {
        toast.success(getSuccessMessage(vars));
        mutationOptions?.onSuccess?.();
        options?.onSuccess?.(data, vars);
      },
      onError: (error, vars) => {
        toast.error(getErrorMessage(error));
        mutationOptions?.onError?.();
        options?.onError?.(error, vars);
      },
    });
  };

  return {
    ...mutation,
    mutateSilent,
    mutateWithToast,
  };
}
