import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type ApiActionMode = 'success' | 'error' | 'silent';

export interface UseApiActionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * A unified hook to standardize API action patterns (success, error, silent).
 * Handles loading states, error tracking, and toast notifications consistently.
 */
export function useApiAction(options: UseApiActionOptions = {}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (
      fn: () => Promise<any>,
      mode: ApiActionMode = 'success',
      successMessage?: string,
      errorMessage?: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fn();
        
        if (mode === 'success' && successMessage) {
          toast({ title: successMessage });
        } else if (mode === 'error' && errorMessage) {
          toast({ variant: 'destructive', title: errorMessage });
        }

        options.onSuccess?.();
        return result;
      } catch (err: any) {
        const errObj = err instanceof Error ? err : new Error(err?.message || 'An unknown error occurred');
        setError(errObj);

        if (mode === 'error' && errorMessage) {
          toast({ variant: 'destructive', title: errorMessage });
        }

        options.onError?.(errObj);
        throw errObj;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, options]
  );

  return { execute, isLoading, error, reset: () => setError(null) };
}
