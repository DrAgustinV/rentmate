import { toast } from 'sonner';

export interface ToastConfig {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  silent?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Standardizes handling of API responses with toast notifications.
 * Automatically suppresses toasts if `silent: true` is passed.
 * 
 * @example
 * const result = await supabase.from('table').insert({ ... });
 * const response = handleApiResponse(result, {
 *   successTitle: 'Saved',
 *   successDescription: 'Your changes have been saved.',
 *   silent: false
 * });
 * 
 * if (response.success) { ... }
 */
export function handleApiResponse<T = any>(
  result: { data: T | null; error: Error | null },
  config: ToastConfig = {}
): ApiResponse<T> {
  if (result.error) {
    if (!config.silent) {
      toast.error(config.errorTitle || 'Error', {
        description: config.errorDescription || result.error.message,
      });
    }
    return { success: false, error: result.error };
  }

  if (config.successTitle || config.successDescription) {
    toast.success(config.successTitle || 'Success', {
      description: config.successDescription,
    });
  }

  return { success: true, data: result.data as T };
}
