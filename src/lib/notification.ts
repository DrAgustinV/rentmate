import { toast } from "sonner";
import type { ToastOptions } from "sonner";

export type NotificationVariant = "success" | "error" | "info" | "warning";

interface NotificationConfig extends Omit<ToastOptions, "duration"> {
  duration?: number;
}

const DEFAULT_DURATION = 3000;

/**
 * Unified notification wrapper that standardizes success, error, info, warning, and silent patterns.
 * Centralizes toast configuration, durations, and behavior across the application.
 */
export const notification = {
  success: (title: string, description?: string, config?: NotificationConfig) => {
    toast.success(title, {
      description,
      duration: config?.duration ?? DEFAULT_DURATION,
      ...config,
    });
  },

  error: (title: string, description?: string, config?: NotificationConfig) => {
    toast.error(title, {
      description,
      duration: config?.duration ?? DEFAULT_DURATION,
      ...config,
    });
  },

  info: (title: string, description?: string, config?: NotificationConfig) => {
    toast.info(title, {
      description,
      duration: config?.duration ?? DEFAULT_DURATION,
      ...config,
    });
  },

  warning: (title: string, description?: string, config?: NotificationConfig) => {
    toast.warning(title, {
      description,
      duration: config?.duration ?? DEFAULT_DURATION,
      ...config,
    });
  },

  /**
   * Use for internal operations, background tasks, or when UI feedback is handled elsewhere.
   * Logs to console in development for debugging without triggering UI toasts.
   */
  silent: (message?: string) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Notification] Silent: ${message || "No message provided"}`);
    }
  },
};

/**
 * Hook to access notification methods within components.
 * Provides the same interface as the `notification` object for convenience in React contexts.
 */
export function useNotification() {
  return notification;
}
