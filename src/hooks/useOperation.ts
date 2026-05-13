import { useState, useCallback } from 'react';

export interface UseOperationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  /** If true, suppresses default error logging/UI feedback. Caller handles it. */
  silent?: boolean;
}

export interface UseOperationResult<TData = unknown> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  success: boolean;
  execute: (operation: () => Promise<TData>) => Promise<void>;
  reset: () => void;
}

export function useOperation<TData = unknown>(
  options: UseOperationOptions<TData> = {}
): UseOperationResult<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  const execute = useCallback(
    async (operation: () => Promise<TData>) => {
      reset();
      setLoading(true);
      try {
        const result = await operation();
        setData(result);
        setSuccess(true);
        if (!options.silent && options.onSuccess) {
          options.onSuccess(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        if (!options.silent && options.onError) {
          options.onError(error);
        }
      } finally {
        setLoading(false);
      }
    },
    [options.silent, options.onSuccess, options.onError, reset]
  );

  return { data, loading, error, success, execute, reset };
}
