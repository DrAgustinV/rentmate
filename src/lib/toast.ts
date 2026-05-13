import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";
import type { ReactNode } from "react";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface UnifiedToastOptions extends Omit<SonnerToastOptions, 'duration'> {
  title?: string | ReactNode;
  description?: string | ReactNode;
  duration?: number;
}

const DEFAULT_DURATION = 4000;

/**
 * Standardized success toast
 */
export const showSuccess = (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
  return sonnerToast.success(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
};

/**
 * Standardized error toast
 */
export const showError = (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
  return sonnerToast.error(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
};

/**
 * Standardized info toast
 */
export const showInfo = (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
  return sonnerToast.info(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
};

/**
 * Standardized warning toast
 */
export const showWarning = (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
  return sonnerToast.warning(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
};

/**
 * Standardized neutral/silent toast
 * Defaults to a longer duration to ensure visibility without immediate auto-dismiss.
 */
export const showNeutral = (title: string | ReactNode, description?: string | ReactNode, options?: Omit<UnifiedToastOptions, 'title'>) => {
  return sonnerToast(title, { description, duration: options?.duration ?? DEFAULT_DURATION, ...options });
};

// Alias for backward compatibility or preference
export const showSilent = showNeutral;

/**
 * Dismiss all active toasts
 */
export const dismissAll = () => {
  sonnerToast.dismiss();
};
