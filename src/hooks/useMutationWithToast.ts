import { useMutation, UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface UseMutationWithToastOptions<TData = unknown, TVariables = unknown, TContext = unknown>
  extends UseMutationOptions<TData, unknown, TVariables, TContext> {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
}

export function useMutationWithToast<TData = unknown, TVariables = unknown, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationWithToastOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  return useMutation<TData, unknown, TVariables, TContext>({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (!options?.silent && options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!options?.silent && options?.errorMessage) {
        toast.error(options.errorMessage);
      }
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}
