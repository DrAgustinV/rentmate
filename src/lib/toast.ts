import { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: ReactNode;
  onDismiss?: () => void;
}

const DEFAULT_DURATION = 3000;

/**
 * Unified toast wrapper that standardizes success, error, info, warning, and silent patterns.
 * Provides consistent defaults, predictable API shape, and centralized configuration.
 */
export const toast = {
  success: (options: ToastOptions) => {
    sonnerToast.success(options.title || "Success", {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  error: (options: ToastOptions) => {
    sonnerToast.error(options.title || "Error", {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  info: (options: ToastOptions) => {
    sonnerToast.info(options.title || "Info", {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  warning: (options: ToastOptions) => {
    sonnerToast.warning(options.title || "Warning", {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  silent: (options: ToastOptions) => {
    // Intended for background updates or internal logging without UI interruption
    if (options.description) {
      console.log(`[Toast Silent] ${options.title || 'Info'}: ${options.description}`);
    }
    options.onDismiss?.();
  },
  loading: (description: string) => sonnerToast.loading(description),
  dismiss: (id?: string) => sonnerToast.dismiss(id),
};

// Export as showToast for backward compatibility with existing imports
export const showToast = toast;
