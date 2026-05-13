import { toast } from '@/hooks/use-toast';

export interface ApiFeedbackOptions {
  showSuccess?: boolean;
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Standardized wrapper for async API calls that handles success/error/silent feedback patterns.
 * Automatically shows toasts based on configuration, or remains silent if both flags are false.
 */
export async function executeWithFeedback<T>(
  asyncFn: () => Promise<T>,
  options: ApiFeedbackOptions = {}
): Promise<T> {
  const {
    showSuccess = true,
    showError = true,
    successMessage = 'Operation successful',
    errorMessage = 'Operation failed',
    onSuccess,
    onError,
  } = options;

  try {
    const data = await asyncFn();
    
    if (showSuccess) {
      toast({
        title: 'Success',
        description: successMessage,
      });
    }
    
    onSuccess?.(data);
    return data;
  } catch (error: any) {
    if (showError) {
      toast({
        title: 'Error',
        description: errorMessage || error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
    
    onError?.(error);
    throw error;
  }
}

/**
 * Helper to execute an async function silently (no toasts)
 */
export async function executeSilent<T>(
  asyncFn: () => Promise<T>,
  onSuccess?: (data: any) => void,
  onError?: (error: any) => void
): Promise<T> {
  return executeWithFeedback(asyncFn, {
    showSuccess: false,
    showError: false,
    onSuccess,
    onError,
  });
}
