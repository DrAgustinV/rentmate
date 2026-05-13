import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ApiFeedbackOptions {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}

/**
 * Standardized wrapper for async operations (API calls, mutations, etc.)
 * that handles success/error feedback consistently across the application.
 */
export async function executeWithFeedback<T>(
  operation: () => Promise<T>,
  options: ApiFeedbackOptions = {}
): Promise<T | null> {
  const { successMessage, errorMessage, silent = false, onSuccess, onError } = options;

  try {
    const result = await operation();
    
    if (!silent && successMessage) {
      toast.success(successMessage);
    }
    
    onSuccess?.(result);
    return result;
  } catch (error) {
    if (!silent && errorMessage) {
      toast.error(errorMessage);
    }
    
    onError?.(error);
    return null;
  }
}

/**
 * Standardized synchronous response handler.
 */
export function handleSyncResult(
  result: { success: boolean; data?: unknown; error?: unknown } | any,
  options: ApiFeedbackOptions = {}
): void {
  const { successMessage, errorMessage, silent = false, onSuccess, onError } = options;

  if (silent) {
    if (result?.success) onSuccess?.(result.data);
    if (!result?.success) onError?.(result?.error);
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
 * Hook to standardize API result handling within React components.
 * Returns a function that can be passed to mutations or async handlers.
 */
export function useUnifiedAction(options: ApiFeedbackOptions = {}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const execute = useCallback(async (action: () => Promise<unknown>) => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const result = await action();
      setStatus('success');
      options.onSuccess?.(result);
      if (!options.silent) {
        toast.success(options.successMessage || 'Operation successful');
      }
      return result;
    } catch (error) {
      setStatus('error');
      options.onError?.(error as Error);
      if (!options.silent) {
        toast.error(options.errorMessage || 'Operation failed');
      }
      throw error;
    } finally {
      setStatus('idle');
    }
  }, [status, options]);

  return { execute, status };
}

/**
 * Factory function to create standardized onSuccess/onError callbacks.
 * Use this when passing handlers to TanStack Query mutations or similar async patterns.
 */
export function createMutationCallbacks(options: ApiFeedbackOptions) {
  return {
    onSuccess: (data: unknown) => {
      if (!options.silent && options.successMessage) {
        toast.success(options.successMessage);
      }
      options.onSuccess?.(data);
    },
    onError: (error: unknown) => {
      if (!options.silent && options.errorMessage) {
        toast.error(options.errorMessage);
      }
      options.onError?.(error);
    },
  };
}
