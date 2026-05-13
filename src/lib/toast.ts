import { toast } from 'sonner';
import React from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'silent';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

const DEFAULT_DURATION = 3000;

const showToast = {
  success: (options: ToastOptions) => {
    toast.success(options.title || 'Success', {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  error: (options: ToastOptions) => {
    toast.error(options.title || 'Error', {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  info: (options: ToastOptions) => {
    toast.info(options.title || 'Information', {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  warning: (options: ToastOptions) => {
    toast.warning(options.title || 'Warning', {
      description: options.description,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      onDismiss: options.onDismiss,
    });
  },
  silent: (options: ToastOptions) => {
    // Silent pattern: intended for background updates or internal logging without UI interruption
    if (options.description) {
      console.log(`[Toast Silent] ${options.title || 'Info'}: ${options.description}`);
    }
    options.onDismiss?.();
  },
};

export { showToast };
