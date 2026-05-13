import { toast } from "sonner";

export type FeedbackMode = 'toast' | 'silent';

export interface ApiHandlerOptions {
  successMessage?: string;
  errorMessage?: string;
  mode?: FeedbackMode;
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}

/**
 * Standardized wrapper for asynchronous operations (API calls, mutations, etc.)
 * that handles success/error feedback consistently across the application.
 *
 * @param operation - The async function to execute
 * @param options - Configuration for feedback and callbacks
 * @returns The result of the operation, or null if it failed
 */
export async function handleApiCall<T>(
  operation: () => Promise<T>,
  options: ApiHandlerOptions = {}
): Promise<T | null> {
  const { successMessage, errorMessage, mode = 'toast', onSuccess, onError } = options;

  try {
    const result = await operation();
    
    if (mode === 'toast' && successMessage) {
      toast.success(successMessage);
    }
    
    onSuccess?.(result);
    return result;
  } catch (error) {
    if (mode === 'toast' && errorMessage) {
      toast.error(errorMessage);
    }
    
    onError?.(error);
    return null;
  }
}
