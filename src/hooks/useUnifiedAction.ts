import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseUnifiedActionOptions {
  onSuccess?: (data?: unknown) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
}

export function useUnifiedAction(options: UseUnifiedActionOptions = {}) {
  const [status, setStatus] = useState<ActionStatus>('idle');

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
