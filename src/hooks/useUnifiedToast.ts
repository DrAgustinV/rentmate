import { toast } from "sonner";

export type ToastVariant = 'success' | 'error' | 'info' | 'silent';

export interface UnifiedToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

/**
 * Unified toast hook that standardizes success, error, info, and silent notification patterns.
 * Wraps `sonner` toast to provide a consistent API across the application.
 * 
 * Usage:
 * const { success, error, info, silent } = useUnifiedToast();
 * 
 * success('Saved', 'Your changes have been persisted.');
 * error('Failed', 'Could not connect to the server.');
 * silent('Debug', 'Internal state updated.');
 */
export const useUnifiedToast = () => {
  const show = (variant: ToastVariant, options: UnifiedToastOptions) => {
    const { title, description, duration } = options;

    switch (variant) {
      case 'success':
        return toast.success(title, { description, duration });
      case 'error':
        return toast.error(title, { description, duration });
      case 'info':
        return toast.info(title, { description, duration });
      case 'silent':
      default:
        return toast(title, { description, duration });
    }
  };

  return {
    success: (title?: string, description?: string, duration?: number) =>
      show('success', { title, description, duration }),
    error: (title?: string, description?: string, duration?: number) =>
      show('error', { title, description, duration }),
    info: (title?: string, description?: string, duration?: number) =>
      show('info', { title, description, duration }),
    silent: (title?: string, description?: string, duration?: number) =>
      show('silent', { title, description, duration }),
  };
};
