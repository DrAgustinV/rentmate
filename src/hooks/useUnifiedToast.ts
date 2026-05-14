import { showToast as toast } from "@/lib/toast";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'silent' | 'loading';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

/**
 * React hook wrapper for the unified toast system.
 * Provides a consistent API for triggering toasts within components.
 * 
 * Usage:
 * const { success, error, info, silent } = useUnifiedToast();
 * success('Saved', 'Your changes have been persisted.');
 * error('Failed', 'Could not connect to the server.');
 */
export function useUnifiedToast() {
  const show = (variant: ToastVariant, options: ToastOptions) => {
    const { title, description, duration } = options;
    const message = title || description || '';
    
    switch (variant) {
      case 'success': return toast.success(message, { description, duration });
      case 'error': return toast.error(message, { description, duration });
      case 'info': return toast.info(message, { description, duration });
      case 'warning': return toast.warning(message, { description, duration });
      case 'silent': return toast.silent(message, { description, duration });
      case 'loading': return toast.loading(message, { description, duration });
      default: return toast.silent(message, { description, duration });
    }
  };

  return {
    success: (title?: string, description?: string, duration?: number) =>
      show('success', { title, description, duration }),
    error: (title?: string, description?: string, duration?: number) =>
      show('error', { title, description, duration }),
    info: (title?: string, description?: string, duration?: number) =>
      show('info', { title, description, duration }),
    warning: (title?: string, description?: string, duration?: number) =>
      show('warning', { title, description, duration }),
    silent: (title?: string, description?: string, duration?: number) =>
      show('silent', { title, description, duration }),
    loading: (title?: string, description?: string, duration?: number) =>
      show('loading', { title, description, duration }),
    dismiss: (id?: string) => toast.dismiss(id),
  };
}
