import React from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'silent';

export interface ToastOptions {
  duration?: number;
  action?: React.ReactNode;
  description?: string;
}

/**
 * Unified toast wrapper that standardizes success, error, info, and silent notification patterns.
 */
export const showToast = (
  type: ToastType,
  message: string,
  options?: ToastOptions
) => {
  const baseOptions = {
    duration: type === 'silent' ? 0 : 3000,
    ...options,
  };

  switch (type) {
    case 'success':
      return toast.success(message, baseOptions);
    case 'error':
      return toast.error(message, baseOptions);
    case 'info':
      return toast.info(message, baseOptions);
    case 'silent':
      return toast(message, baseOptions);
    default:
      return toast(message, baseOptions);
  }
};

// Convenience exports for common use cases
export const showSuccess = (message: string, options?: ToastOptions) => showToast('success', message, options);
export const showError = (message: string, options?: ToastOptions) => showToast('error', message, options);
export const showInfo = (message: string, options?: ToastOptions) => showToast('info', message, options);
export const showSilent = (message: string, options?: ToastOptions) => showToast('silent', message, options);
