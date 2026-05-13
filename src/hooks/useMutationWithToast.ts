import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createMutationCallbacks, ApiFeedbackOptions } from '../lib/api';

export interface ToastConfig {
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
  extends UseMutationOptions<TData, unknown, TVariables, TContext> {
  toast?: ToastConfig;
}

export function useMutationWithToast<TData, TVariables, TContext = unknown>(
  options: UseMutationWithToastOptions<TData, TVariables, TContext>
): UseMutationResult<TData, unknown, TVariables, TContext> {
  const { toast: toastConfig, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (!toastConfig?.silent) {
        if (toastConfig?.success) {
          toast.success(toastConfig.success.title || 'Success', {
            description: toastConfig.success.description,
          });
        } else {
          toast.success('Success');
        }
      }
      mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (!toastConfig?.silent) {
        if (toastConfig?.error) {
          toast.error(toastConfig.error.title || 'Error', {
            description: toastConfig.error.description,
          });
        } else {
          toast.error('An error occurred');
        }
      }
      mutationOptions.onError?.(error, variables, context);
    },
  });
}
