import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

export type FeedbackMode = 'success' | 'error' | 'silent';

export interface StandardMutationOptions<TData, TVariables, TContext> 
  extends UseMutationOptions<TData, unknown, TVariables, TContext> {
  feedbackMode?: FeedbackMode;
  successMessage?: string;
  errorMessage?: string;
}

export function useStandardMutation<TData, TVariables, TContext>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: StandardMutationOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> & {
  mutateWithFeedback: (variables: TVariables, feedbackMode?: FeedbackMode) => void;
} {
  const { feedbackMode = 'success', successMessage, errorMessage, ...baseOptions } = options ?? {};

  const mutation = useMutation<TData, unknown, TVariables, TContext>(mutationFn, {
    ...baseOptions,
    onSuccess: (data, variables, context) => {
      if (feedbackMode !== 'silent' && feedbackMode !== 'error') {
        toast.success(successMessage || 'Operation successful');
      }
      baseOptions?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (feedbackMode !== 'silent' && feedbackMode !== 'success') {
        toast.error(errorMessage || 'Operation failed');
      }
      baseOptions?.onError?.(error, variables, context);
    },
  });

  return {
    ...mutation,
    mutateWithFeedback: (variables: TVariables, mode?: FeedbackMode) => {
      mutation.mutate(variables, {
        onSuccess: (data, vars, ctx) => {
          if (mode === 'silent' || mode === 'error') return;
          toast.success(successMessage || 'Operation successful');
        },
        onError: (error, vars, ctx) => {
          if (mode === 'silent' || mode === 'success') return;
          toast.error(errorMessage || 'Operation failed');
        },
      });
    },
  };
}
