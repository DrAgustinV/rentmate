import { toast as sonnerToast } from "sonner";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "silent";

type ToastOptions = Omit<Parameters<typeof sonnerToast>[1], "duration">;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 5000,
  info: 4000,
  silent: 0,
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  silent: null,
};

/**
 * Unified toast function that standardizes success/error/info/silent patterns.
 * Centralizes default durations and icons while allowing overrides.
 */
export function showToast(
  variant: ToastVariant,
  message: string,
  options?: ToastOptions
) {
  const duration = options?.duration ?? DEFAULT_DURATIONS[variant];
  const icon = options?.icon ?? VARIANT_ICONS[variant];
  
  return sonnerToast(message, {
    icon,
    duration,
    ...options,
  });
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
