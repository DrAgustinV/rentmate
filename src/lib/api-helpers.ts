import { toast } from "sonner";

export interface ApiResultOptions {
  onSuccess?: (data?: unknown) => void;
  onError?: (error: Error) => void;
  silent?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Standardizes handling of API/mutation results across the application.
 * Automatically shows success/error toasts unless `silent` is true.
 */
export function handleApiResult(
  result: { data?: unknown; error?: Error | null },
  options: ApiResultOptions = {}
): boolean {
  const { onSuccess, onError, silent, successMessage, errorMessage } = options;

  if (result.error) {
    if (!silent) {
      toast.error(errorMessage || "An error occurred. Please try again.");
    }
    if (onError) onError(result.error);
    return false;
  }

  if (onSuccess) onSuccess(result.data);
  if (!silent && successMessage) {
    toast.success(successMessage);
  }
  return true;
}

/**
 * Hook to standardize API result handling within React components.
 * Returns a function that can be passed to mutations or async handlers.
 */
export function useApiToast(options: ApiResultOptions = {}) {
  return (result: { data?: unknown; error?: Error | null }) => {
    return handleApiResult(result, options);
  };
}
