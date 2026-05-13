import { useState, useCallback } from 'react';

/**
 * Standardized result interface for async operations.
 * Provides consistent shape for data, error, loading state, and reset capability.
 */
export interface OperationResult<T = unknown> {
  data: T | null;
  error: Error | string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/** Type guard to narrow result to success state */
export function isSuccessResult<T>(result: OperationResult<T>): result is OperationResult<T> & { isSuccess: true } {
  return result.isSuccess;
}

/** Type guard to narrow result to error state */
export function isErrorResult<T>(result: OperationResult<T>): result is OperationResult<T> & { isError: true } {
  return result.isError;
}

/**
 * React hook that standardizes success/error/silent patterns for async operations.
 * 
 * Usage:
 * - Success: Provide `onSuccess` callback or check `result.isSuccess`
 * - Error: Provide `onError` callback or check `result.isError`
 * - Silent: Omit callbacks and only check `result.isSuccess`/`result.isError` manually
 */
export function useOperationResult<T = unknown>(options?: {
  onSuccess?: (data: T) => void;
  onError?: (error: Error | string) => void;
  onSettled?: () => void;
}) {
  const [state, setState] = useState<OperationResult<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    reset: () => setState({ data: null, error: null, isLoading: false, isSuccess: false, isError: false, reset: () => {} }),
  });

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false, isSuccess: false, isError: false, reset });
  }, []);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, isSuccess: false, isError: false, data: null, error: null }));
    try {
      const result = await asyncFn();
      setState({
        data: result,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
        reset,
      });
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({
        data: null,
        error,
        isLoading: false,
        isSuccess: false,
        isError: true,
        reset,
      });
      options?.onError?.(error);
      throw err;
    } finally {
      options?.onSettled?.();
    }
  }, [options, reset]);

  return { ...state, reset, execute };
}

/**
 * Non-React utility wrapper for standardizing success/error/silent patterns.
 * Useful for services, utils, or non-component contexts.
 */
export function wrapOperation<T>(
  asyncFn: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error | string) => void;
    onSettled?: () => void;
  }
): Promise<T> {
  return asyncFn().then(
    (data) => {
      options?.onSuccess?.(data);
      return data;
    },
    (error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
      throw err;
    }
  ).finally(() => options?.onSettled?.());
}
