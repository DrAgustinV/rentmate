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
 * Automatically shows toasts unless `silent` is true or explicitly disabled.
 * 
 * @param operation - The async function to execute
 * @param options - Configuration for feedback and callbacks
 * @returns The result of the operation, or null if it failed
 */
export async function executeWithFeedback<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<T | null> {
  try {
    const result = await operation();
    
    const shouldShowSuccess = options.showSuccessToast ?? !options.silent;
    if (shouldShowSuccess) {
      toast.success(options.successMessage || "Operation successful");
    }
    
    options.onSuccess?.(result);
    return result;
  } catch (error) {
    const shouldShowError = options.showErrorToast ?? !options.silent;
    if (shouldShowError) {
      toast.error(options.errorMessage || "Operation failed");
    }
    
    options.onError?.(error);
    return null;
  }
}
