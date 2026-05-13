import { toast } from 'sonner';

export interface HandleResponseOptions {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Standardized synchronous response handler.
 * Use this when you have an immediate result object (e.g., from a direct API call).
 */
export function handleResponse(
  result: { success: boolean; data?: any; error?: any } | any,
  options: HandleResponseOptions = {}
) {
  const { successMessage, errorMessage, silent, onSuccess, onError } = options;

  if (silent) {
    if (result?.success && onSuccess) onSuccess(result.data);
    if (!result?.success && onError) onError(result?.error);
    return;
  }

  if (result?.success) {
    toast.success(successMessage || 'Success');
    onSuccess?.(result.data);
  } else {
    toast.error(errorMessage || result?.error?.message || 'An error occurred');
    onError?.(result?.error);
  }
}

/**
 * Factory function to create standardized onSuccess/onError callbacks.
 * Use this when passing handlers to TanStack Query mutations or similar async patterns.
 */
export function createHandleResponse(options: HandleResponseOptions) {
  return {
    onSuccess: (data: any) => {
      if (!options.silent && options.successMessage) {
        toast.success(options.successMessage);
      }
      options.onSuccess?.(data);
    },
    onError: (error: any) => {
      if (!options.silent && options.errorMessage) {
        toast.error(options.errorMessage);
      }
      options.onError?.(error);
    },
  };
}
