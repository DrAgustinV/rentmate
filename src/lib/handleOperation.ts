import { toast } from "@/lib/toast";

export type OperationMode = 'success' | 'error' | 'silent';

export interface OperationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  mode?: OperationMode;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Standardized wrapper for executing operations with consistent success/error/silent feedback.
 * Automatically handles toast notifications, custom callbacks, and error normalization.
 */
export async function handleOperation(
  operation: () => Promise<void>,
  options: OperationOptions = {}
): Promise<boolean> {
  const {
    onSuccess,
    onError,
    mode = 'success',
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed. Please try again.',
  } = options;

  try {
    await operation();
    
    if (mode !== 'silent' && mode !== 'error') {
      toast.success(successMessage);
    }
    
    onSuccess?.();
    return true;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (mode !== 'silent' && mode !== 'success') {
      toast.error(errorMessage);
    }
    
    onError?.(err);
    return false;
  }
}
