import { toast as sonnerToast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "silent";

type ToastOptions = Omit<Parameters<typeof sonnerToast>[1], "duration">;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
  silent: 0,
};

const DEFAULT_CONFIGS: Record<ToastVariant, Partial<Parameters<typeof sonnerToast>[1]>> = {
  success: {},
  error: {},
  info: {},
  silent: { closeButton: false },
};

/**
 * Unified toast function that standardizes success/error/info/silent patterns.
 * Centralizes default durations and configurations while allowing overrides.
 */
export function showToast(
  variant: ToastVariant,
  message: string,
  options?: ToastOptions
) {
  const duration = options?.duration ?? DEFAULT_DURATIONS[variant];
  const baseConfig = DEFAULT_CONFIGS[variant];
  const finalOptions = { duration, ...baseConfig, ...options };

  switch (variant) {
    case "success":
      sonnerToast.success(message, finalOptions);
      break;
    case "error":
      sonnerToast.error(message, finalOptions);
      break;
    case "info":
      sonnerToast.info(message, finalOptions);
      break;
    case "silent":
      sonnerToast(message, finalOptions);
      break;
  }
}

/**
 * Convenience wrapper maintaining the original API for backward compatibility.
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => showToast("success", message, options),
  error: (message: string, options?: ToastOptions) => showToast("error", message, options),
  info: (message: string, options?: ToastOptions) => showToast("info", message, options),
  silent: (message: string, options?: ToastOptions) => showToast("silent", message, options),
  dismiss: (id?: string) => sonnerToast.dismiss(id),
  remove: (id?: string) => sonnerToast.remove(id),
} as const;

export { toast as default };
