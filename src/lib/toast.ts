import { toast as sonnerToast } from "sonner";
import { ReactNode } from "react";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'silent';

export interface ToastConfig {
  title: string;
  description?: string;
  duration?: number;
  action?: ReactNode;
  onDismiss?: () => void;
  [key: string]: any;
}

/**
 * Unified toast dispatcher that standardizes success, error, info, warning, and silent patterns.
 * Centralizes configuration and reduces boilerplate across components.
 */
export const showToast = (
  variant: ToastVariant,
  config: ToastConfig
) => {
  const { title, description, duration = 3000, action, onDismiss, ...rest } = config;

  switch (variant) {
    case 'success':
      sonnerToast.success(title, { description, duration, action, onDismiss, ...rest });
      break;
    case 'error':
      sonnerToast.error(title, { description, duration, action, onDismiss, ...rest });
      break;
    case 'info':
      sonnerToast.info(title, { description, duration, action, onDismiss, ...rest });
      break;
    case 'warning':
      sonnerToast.warning(title, { description, duration, action, onDismiss, ...rest });
      break;
    case 'silent':
      sonnerToast(title, { description, duration, action, onDismiss, ...rest });
      break;
    default:
      sonnerToast(title, { description, duration, action, onDismiss, ...rest });
  }
};

/**
 * Hook providing a standardized interface for toast notifications.
 * Usage: const { success, error, silent } = useUnifiedToast();
 */
export const useUnifiedToast = () => {
  return {
    success: (config: ToastConfig) => showToast('success', config),
    error: (config: ToastConfig) => showToast('error', config),
    info: (config: ToastConfig) => showToast('info', config),
    warning: (config: ToastConfig) => showToast('warning', config),
    silent: (config: ToastConfig) => showToast('silent', config),
  };
};

export default showToast;
