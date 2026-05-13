import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "warning" | "silent";

export interface ToastOptions extends Omit<SonnerToastOptions, "type"> {
  title?: string;
  description?: string;
  duration?: number;
}

/**
 * Unified toast wrapper that standardizes success, error, info, warning, and silent patterns.
 * Provides a consistent API across the application and handles default configurations.
 */
export const showToast = {
  success: (options: ToastOptions) =>
    sonnerToast.success(options.title ?? "Success", { description: options.description, duration: options.duration, ...options }),
  error: (options: ToastOptions) =>
    sonnerToast.error(options.title ?? "Error", { description: options.description, duration: options.duration, ...options }),
  info: (options: ToastOptions) =>
    sonnerToast.info(options.title ?? "Info", { description: options.description, duration: options.duration, ...options }),
  warning: (options: ToastOptions) =>
    sonnerToast.warning(options.title ?? "Warning", { description: options.description, duration: options.duration, ...options }),
  silent: (options: ToastOptions) =>
    sonnerToast(options.title ?? "", { description: options.description, duration: options.duration, ...options }),
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
