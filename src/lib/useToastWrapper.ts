import { showToast as originalShowToast } from "@/lib/toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export interface ToastActions {
  success: (options: ToastOptions) => void;
  error: (options: ToastOptions) => void;
  silent: (options: ToastOptions) => void;
}

/**
 * Unified toast wrapper that standardizes success, error, and silent patterns.
 * 
 * Usage:
 * const { success, error, silent } = useToastWrapper();
 * success({ title: "Saved", description: "Changes applied successfully." });
 * error({ title: "Failed", description: error.message });
 * silent({ title: "Debug", description: "Internal state updated." });
 */
export function useToastWrapper(): ToastActions {
  const showToastActions: ToastActions = {
    success: (options) => {
      originalShowToast.success(options);
    },
    error: (options) => {
      originalShowToast.error(options);
    },
    silent: (options) => {
      // Silent pattern: logs in development, can be extended for analytics or internal tracking
      if (import.meta.env.DEV) {
        console.log(`[Toast Silent] ${options.title || ''}: ${options.description || ''}`);
      }
    },
  };

  return showToastActions;
}
