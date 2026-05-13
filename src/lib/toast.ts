import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "warning" | "silent";

export interface ToastOptions extends Omit<SonnerToastOptions, "type"> {
  title?: string;
  description?: string;
  duration?: number;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
  warning: 4000,
  silent: 0,
};

/**
 * Unified toast wrapper that standardizes success, error, info, warning, and silent patterns.
 * Provides a consistent API across the application and handles default configurations.
 */
export const showToast = {
  success: (options: ToastOptions) =>
    sonnerToast.success(options.title ?? "Success", { 
      description: options.description, 
      duration: options.duration ?? DEFAULT_DURATIONS.success, 
      ...options 
    }),
  error: (options: ToastOptions) =>
    sonnerToast.error(options.title ?? "Error", { 
      description: options.description, 
      duration: options.duration ?? DEFAULT_DURATIONS.error, 
      ...options 
    }),
  info: (options: ToastOptions) =>
    sonnerToast.info(options.title ?? "Info", { 
      description: options.description, 
      duration: options.duration ?? DEFAULT_DURATIONS.info, 
      ...options 
    }),
  warning: (options: ToastOptions) =>
    sonnerToast.warning(options.title ?? "Warning", { 
      description: options.description, 
      duration: options.duration ?? DEFAULT_DURATIONS.warning, 
      ...options 
    }),
  silent: (options: ToastOptions) =>
    sonnerToast(options.title ?? "", { 
      description: options.description, 
      duration: DEFAULT_DURATIONS.silent, 
      ...options 
    }),
  dismiss: (id?: string) => sonnerToast.dismiss(id),
  remove: (id?: string) => sonnerToast.remove(id),
  /**
   * Generic dispatcher to programmatically trigger any standardized variant.
   */
  show: (variant: ToastVariant, options: ToastOptions) => {
    switch (variant) {
      case "success": return showToast.success(options);
      case "error": return showToast.error(options);
      case "info": return showToast.info(options);
      case "warning": return showToast.warning(options);
      case "silent": return showToast.silent(options);
    }
  },
};

/**
 * React hook wrapper for showToast, maintaining consistency with other custom hooks.
 */
export function useToast() {
  return showToast;
}

export { showToast };
