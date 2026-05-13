import { toast } from "sonner";
import type { ToastOptions as SonnerToastOptions } from "sonner";

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'silent';

export interface StandardToastOptions extends Omit<SonnerToastOptions, 'variant' | 'duration'> {
  variant?: ToastVariant;
  duration?: number;
  title: string;
  description?: string;
}

const DEFAULT_DURATION = 4000;
const DEFAULT_POSITION: SonnerToastOptions['position'] = 'top-right';

export function showToast(options: StandardToastOptions) {
  const { 
    variant = 'info', 
    duration = DEFAULT_DURATION, 
    title, 
    description, 
    position = DEFAULT_POSITION,
    ...rest 
  } = options;

  if (variant === 'silent') {
    return;
  }

  toast[variant](title, {
    description,
    duration,
    position,
    ...rest,
  });
}

export const toastUtils = {
  success: (title: string, description?: string, options?: Omit<SonnerToastOptions, 'variant' | 'duration' | 'position'>) =>
    showToast({ variant: 'success', title, description, ...options }),
  error: (title: string, description?: string, options?: Omit<SonnerToastOptions, 'variant' | 'duration' | 'position'>) =>
    showToast({ variant: 'error', title, description, ...options }),
  info: (title: string, description?: string, options?: Omit<SonnerToastOptions, 'variant' | 'duration' | 'position'>) =>
    showToast({ variant: 'info', title, description, ...options }),
  warning: (title: string, description?: string, options?: Omit<SonnerToastOptions, 'variant' | 'duration' | 'position'>) =>
    showToast({ variant: 'warning', title, description, ...options }),
  silent: (title: string, description?: string, options?: Omit<SonnerToastOptions, 'variant' | 'duration' | 'position'>) =>
    showToast({ variant: 'silent', title, description, ...options }),
};

export default toastUtils;
