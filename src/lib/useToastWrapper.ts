import { useUnifiedToast } from "@/hooks/useUnifiedToast";

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
  const toast = useUnifiedToast();

  return {
    success: (options) => toast.success(options.title || '', { description: options.description, duration: options.duration }),
    error: (options) => toast.error(options.title || '', { description: options.description, duration: options.duration }),
    silent: (options) => toast.silent(options.title || '', { description: options.description, duration: options.duration }),
  };
}
