import { toast as sonnerToast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "warning" | "silent";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  id?: string;
}

/**
 * Unified toast utility that standardizes success, error, info, warning, and silent patterns.
 * Replaces direct `toast.success()` / `toast.error()` calls across the codebase.
 */
const showToast = {
  success: (options: ToastOptions) =>
    sonnerToast.success(options.title ?? "Success", { description: options.description, duration: options.duration }),
  error: (options: ToastOptions) =>
    sonnerToast.error(options.title ?? "Error", { description: options.description, duration: options.duration }),
  info: (options: ToastOptions) =>
    sonnerToast.info(options.title ?? "Info", { description: options.description, duration: options.duration }),
  warning: (options: ToastOptions) =>
    sonnerToast.warning(options.title ?? "Warning", { description: options.description, duration: options.duration }),
  silent: (options: ToastOptions) =>
    sonnerToast(options.title ?? "", { description: options.description, duration: options.duration }),
};

/**
 * React hook wrapper for showToast, maintaining consistency with other custom hooks.
 */
export function useToast() {
  return showToast;
}

export { showToast };
