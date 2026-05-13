import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";
import type { ReactNode } from "react";

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'silent';

export interface UnifiedToastOptions extends Omit<SonnerToastOptions, "duration"> {
  title?: string | ReactNode;
  description?: string | ReactNode;
  duration?: number;
}

const DEFAULT_DURATION = 3000;

const showToast = {
  success: (options: UnifiedToastOptions) => {
    const { title, description, duration, ...rest } = options;
    sonnerToast.success(title || '', { description, duration: duration ?? DEFAULT_DURATION, ...rest });
  },
  error: (options: UnifiedToastOptions) => {
    const { title, description, duration, ...rest } = options;
    sonnerToast.error(title || '', { description, duration: duration ?? DEFAULT_DURATION, ...rest });
  },
  info: (options: UnifiedToastOptions) => {
    const { title, description, duration, ...rest } = options;
    sonnerToast.info(title || '', { description, duration: duration ?? DEFAULT_DURATION, ...rest });
  },
  warning: (options: UnifiedToastOptions) => {
    const { title, description, duration, ...rest } = options;
    sonnerToast.warning(title || '', { description, duration: duration ?? DEFAULT_DURATION, ...rest });
  },
  silent: (options: UnifiedToastOptions) => {
    const { title, description, ...rest } = options;
    console.log(`[Toast Silent] ${title || ''}: ${description || ''}`);
    sonnerToast(title || '', { 
      description, 
      duration: 0, 
      className: 'opacity-0 pointer-events-none',
      ...rest 
    });
  },
  show: (type: ToastType, options: UnifiedToastOptions) => {
    switch (type) {
      case 'success': return showToast.success(options);
      case 'error': return showToast.error(options);
      case 'info': return showToast.info(options);
      case 'warning': return showToast.warning(options);
      case 'silent': return showToast.silent(options);
      default: return showToast.info(options);
    }
  }
};

export { showToast };
