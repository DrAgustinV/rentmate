import { toast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "warning" | "silent";

export interface StandardToastOptions {
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  description?: string;
}

/**
 * Unified toast notification wrapper that standardizes success, error, info, warning, and silent patterns.
 * @param variant - The type of toast to display
 * @param title - The main title of the toast
 * @param description - Optional secondary text
 * @param options - Optional styling and duration overrides
 */
export const showToast = (
  variant: ToastVariant,
  title: string,
  description?: string,
  options?: StandardToastOptions
) => {
  if (variant === "silent") {
    // Silent mode: logs to console instead of showing UI notification
    console.log(`[Silent Toast] ${title}: ${description}`);
    return;
  }

  toast[variant](title, { description, ...options });
};

// Convenience exports for common use cases
export const showSuccess = (
  title: string,
  description?: string,
  options?: StandardToastOptions
) => showToast("success", title, description, options);

export const showError = (
  title: string,
  description?: string,
  options?: StandardToastOptions
) => showToast("error", title, description, options);

export const showInfo = (
  title: string,
  description?: string,
  options?: StandardToastOptions
) => showToast("info", title, description, options);

export const showWarning = (
  title: string,
  description?: string,
  options?: StandardToastOptions
) => showToast("warning", title, description, options);

export const showSilent = (
  title: string,
  description?: string,
  options?: StandardToastOptions
) => showToast("silent", title, description, options);

// Re-export the raw sonner toast for advanced use cases if needed
export { toast };
