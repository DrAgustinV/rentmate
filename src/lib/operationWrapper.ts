import { toast } from "sonner";

export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: unknown) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

/**
 * Standardized wrapper for async operations that handles success/error/silent patterns.
 * Automatically shows toasts unless `silent` is true or explicitly disabled via `showSuccessToast`/`showErrorToast`.
 * 
 * @param operation - The async function to execute
 * @param options - Configuration for feedback and callbacks
 * @returns The result of the operation, or null if it failed
 */
export async function executeWithFeedback<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<T | null> {
  const {
    successMessage,
    errorMessage,
    silent = false,
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  try {
    const result = await operation();
    
    if (showSuccessToast && !silent) {
      toast.success(successMessage || "Operation successful");
    }
    
    onSuccess?.(result);
    return result;
  } catch (error) {
    if (showErrorToast && !silent) {
      toast.error(errorMessage || "Operation failed");
    }
    
    onError?.(error);
    return null;
  }
}
