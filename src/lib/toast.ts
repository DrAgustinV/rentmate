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
  /**
   * Generic dispatcher to programmatically trigger any standardized variant.
   * Centralizes duration defaults and prevents accidental override of core toast properties.
   */
  show: (variant: ToastVariant, options: ToastOptions) => {
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
      case "info":
        return sonnerToast.info(title ?? "Info", toastOptions);
      case "warning":
        return sonnerToast.warning(title ?? "Warning", toastOptions);
      case "silent":
        return sonnerToast(title ?? "", toastOptions);
      default:
        return sonnerToast(title ?? "", toastOptions);
    }
  },

  /**
   * Convenience method for success toasts.
   */
  success: (options: ToastOptions) => showToast.show("success", options),

  /**
   * Convenience method for error toasts.
   */
  error: (options: ToastOptions) => showToast.show("error", options),

  /**
   * Convenience method for info toasts.
   */
  info: (options: ToastOptions) => showToast.show("info", options),

  /**
   * Convenience method for warning toasts.
   */
  warning: (options: ToastOptions) => showToast.show("warning", options),

  /**
   * Convenience method for silent toasts (no auto-dismiss).
   */
  silent: (options: ToastOptions) => showToast.show("silent", options),

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
