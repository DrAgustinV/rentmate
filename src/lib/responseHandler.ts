import { showToast as toast } from "@/lib/toast";

export type ResponseMode = 'success' | 'error' | 'silent';

export interface ApiResponseOptions {
  /** Determines how the response is handled: 'success' shows a success toast, 'error' shows an error toast, 'silent' does nothing. */
  mode?: ResponseMode;
  /** Message to display on success */
  successMessage?: string;
  /** Message to display on error */
  errorMessage?: string;
  /** Callback invoked with the resolved data */
  onSuccess?: (data: unknown) => void;
  /** Callback invoked with the caught error */
  onError?: (error: unknown) => void;
}

/**
 * Standardizes handling of asynchronous API responses.
 * Automatically displays toasts based on the `mode` and messages provided.
 * 
 * @example
 * const data = await handleApiResponse(fetchData(), {
 *   mode: 'success',
 *   successMessage: 'Data saved successfully!',
 *   errorMessage: 'Failed to save data.'
 * });
 */
export function handleApiResponse<T>(
  promise: Promise<T>,
  options: ApiResponseOptions = {}
): Promise<T> {
  const {
    mode = 'silent',
    successMessage,
    errorMessage,
    onSuccess,
    onError,
  } = options;

  return promise
    .then((data) => {
      if (mode === 'success' && successMessage) {
        toast.success(successMessage);
      }
      onSuccess?.(data);
      return data;
    })
    .catch((error) => {
      if (mode === 'error' && errorMessage) {
        toast.error(errorMessage);
      }
      onError?.(error);
      throw error;
    });
}

/**
 * Standardizes handling of synchronous operations that may throw.
 * Returns a standardized result object and optionally shows toasts.
 * 
 * @example
 * const { data, error } = handleSyncResponse(() => validateForm(), {
 *   mode: 'error',
 *   errorMessage: 'Validation failed.'
 * });
 */
export function handleSyncResponse<T>(
  operation: () => T,
  options: ApiResponseOptions = {}
): { data: T | null; error: unknown | null } {
  const { mode = 'silent', successMessage, errorMessage, onSuccess, onError } = options;

  try {
    const data = operation();
    if (mode === 'success' && successMessage) {
      toast.success(successMessage);
    }
    onSuccess?.(data);
    return { data, error: null };
  } catch (error) {
    if (mode === 'error' && errorMessage) {
      toast.error(errorMessage);
    }
    onError?.(error);
    return { data: null, error };
  }
}
