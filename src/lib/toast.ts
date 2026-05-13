import { toast as sonnerToast } from "sonner";
import { ReactNode } from "react";

export interface ToastOptions {
  duration?: number;
  action?: ReactNode;
  onDismiss?: () => void;
  [key: string]: any;
}

export interface ToastPayload {
  title?: string;
  description?: string;
  duration?: number;
  action?: ReactNode;
  [key: string]: any;
}

export interface ToastMethods {
  success: (message: string | ToastPayload, options?: ToastOptions) => void;
  error: (message: string | ToastPayload, options?: ToastOptions) => void;
  info: (message: string | ToastPayload, options?: ToastOptions) => void;
  warning: (message: string | ToastPayload, options?: ToastOptions) => void;
  silent: (message: string | ToastPayload, options?: ToastOptions) => void;
}

/**
 * Unified toast wrapper that standardizes success, error, info, warning, and silent patterns.
 * Automatically applies default durations and handles both string messages and payload objects.
 */
export const showToast: ToastMethods = {
  success: (message: string | ToastPayload, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = normalizePayload(message, 3000);
    sonnerToast.success(title, { description, duration, ...rest, ...options });
  },
  error: (message: string | ToastPayload, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = normalizePayload(message, 5000);
    sonnerToast.error(title, { description, duration, ...rest, ...options });
  },
  info: (message: string | ToastPayload, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = normalizePayload(message, 4000);
    sonnerToast.info(title, { description, duration, ...rest, ...options });
  },
  warning: (message: string | ToastPayload, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = normalizePayload(message, 4000);
    sonnerToast.warning(title, { description, duration, ...rest, ...options });
  },
  silent: (message: string | ToastPayload, options: ToastOptions = {}) => {
    const { title, description, duration, ...rest } = normalizePayload(message, 2000);
    sonnerToast(title, { description, duration, ...rest, ...options });
  },
};

function normalizePayload(
  message: string | ToastPayload,
  defaultDuration: number
): { title: string; description?: string; duration: number; [key: string]: any } {
  if (typeof message === "string") {
    return { title: message, description: undefined, duration: defaultDuration };
  }
  return {
    title: message.title || "",
    description: message.description,
    duration: message.duration ?? defaultDuration,
    ...message,
  };
}

export default showToast;
