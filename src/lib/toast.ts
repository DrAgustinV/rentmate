import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";
import type { ReactNode } from "react";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral' | 'silent';

export interface UnifiedToastOptions extends Omit<SonnerToastOptions, 'duration'> {
  title?: string | ReactNode;
  description?: string | ReactNode;
  duration?: number;
}

const DEFAULT_DURATION = 4000;

/**
 * Unified toast wrapper that standardizes success, error, and silent notification patterns.
 * Use `showToast.success`, `showToast.error`, or `showToast.neutral` for consistent behavior.
 */
export const showToast = {
  success: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast.success(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
  error: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast.error(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
  info: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast.info(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
  warning: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast.warning(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
  neutral: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
  silent: (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
    return sonnerToast(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
  },
};

// Alias for backward compatibility
showToast.silent = showToast.neutral;

// Export individual functions for backward compatibility
export const showSuccess = showToast.success;
export const showError = showToast.error;
export const showInfo = showToast.info;
export const showWarning = showToast.warning;
export const showNeutral = showToast.neutral;
export const showSilent = showToast.silent;

/**
 * Dismiss all active toasts
 */
export const dismissAll = () => {
  sonnerToast.dismiss();
};
