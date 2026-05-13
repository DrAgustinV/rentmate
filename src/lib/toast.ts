import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";
import type { ReactNode } from "react";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'silent' | 'loading';

export interface ToastOptions extends Omit<SonnerToastOptions, "duration"> {
  duration?: number;
}

const DEFAULT_DURATION = 3000;

/**
 * Unified toast wrapper that standardizes success, error, info, warning, silent, and loading patterns.
 * Provides consistent defaults, predictable API shape, and centralized configuration.
 */
export const toast = {
  success: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast.success(message, { duration: DEFAULT_DURATION, ...options });
  },
  error: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast.error(message, { duration: DEFAULT_DURATION, ...options });
  },
  info: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast.info(message, { duration: DEFAULT_DURATION, ...options });
  },
  warning: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast.warning(message, { duration: DEFAULT_DURATION, ...options });
  },
  silent: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast(message, { duration: 0, ...options });
  },
  loading: (message: string | ReactNode, options?: ToastOptions) => {
    sonnerToast.loading(message, { duration: Infinity, ...options });
  },
  dismiss: (id?: string) => sonnerToast.dismiss(id),
};
