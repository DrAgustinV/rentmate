import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";

export type ToastVariant = "success" | "error" | "silent";

export interface ToastOptions extends Omit<SonnerToastOptions, "type" | "duration"> {
  title?: string;
  description?: string;
  duration?: number;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  silent: 0,
};

/**
 * Unified toast wrapper that standardizes success, error, and silent patterns.
 * Provides a consistent API across the application and handles default configurations.
 */
export const showToast = {
  /**
   * Generic dispatcher to programmatically trigger any standardized variant.
   * Centralizes duration defaults and prevents accidental override of core toast properties.
   */
  show: (variant: ToastVariant, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = options;
    const defaultDuration = DEFAULT_DURATIONS[variant];
    
    const toastOptions: SonnerToastOptions = {
      description,
      duration: duration ?? defaultDuration,
      ...rest,
    };

    switch (variant) {
      case "success":
        return sonnerToast.success(title ?? "Success", toastOptions);
      case "error":
        return sonnerToast.error(title ?? "Error", toastOptions);
      case "silent":
      default:
        return sonnerToast(title ?? "", toastOptions);
    }
  },

  success: (options?: ToastOptions) => showToast.show("success", options),
  error: (options?: ToastOptions) => showToast.show("error", options),
  silent: (options?: ToastOptions) => showToast.show("silent", options),

  dismiss: (id?: string) => sonnerToast.dismiss(id),
  remove: (id?: string) => sonnerToast.remove(id),
};

/**
 * React hook wrapper for showToast, maintaining consistency with other custom hooks.
 */
export function useToast() {
  return showToast;
}

export { showToast };
