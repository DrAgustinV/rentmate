import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import React from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'silent';

export interface UnifiedToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: React.ReactNode;
}

/**
 * React Hook for standardized toast notifications.
 * Provides methods: success, error, info, warning, silent.
 */
export function useUnifiedToast() {
  const { toast: shadcnToast } = useToast();

  const show = (variant: ToastVariant, options: UnifiedToastOptions) => {
    const shadcnVariant = variant === 'error' ? 'destructive' : 'default';
    
    shadcnToast({
      variant: shadcnVariant,
      className: variant === 'success' ? 'bg-green-500 text-white border-green-600' :
                 variant === 'info' ? 'bg-blue-500 text-white border-blue-600' :
                 variant === 'warning' ? 'bg-yellow-500 text-black border-yellow-600' :
                 variant === 'silent' ? 'bg-muted text-muted-foreground border-border' : '',
      ...options,
    });
  };

  return {
    success: (options: UnifiedToastOptions) => show('success', options),
    error: (options: UnifiedToastOptions) => show('error', options),
    info: (options: UnifiedToastOptions) => show('info', options),
    warning: (options: UnifiedToastOptions) => show('warning', options),
    silent: (options: UnifiedToastOptions) => show('silent', options),
  };
}

/**
 * Static helper for non-React contexts or quick calls.
 * Uses Sonner directly for immediate rendering.
 */
export const showToast = (variant: ToastVariant, message: string, options?: Omit<UnifiedToastOptions, 'title'>) => {
  const baseOptions = {
    duration: variant === 'silent' ? 0 : 3000,
    ...options,
  };

  switch (variant) {
    case 'success':
      return sonnerToast.success(message, baseOptions);
    case 'error':
      return sonnerToast.error(message, baseOptions);
    case 'info':
      return sonnerToast.info(message, baseOptions);
    case 'warning':
      return sonnerToast.warning(message, baseOptions);
    case 'silent':
      return sonnerToast(message, baseOptions);
    default:
      return sonnerToast(message, baseOptions);
  }
};

// Convenience exports
export const showSuccess = (message: string, options?: Omit<UnifiedToastOptions, 'title'>) => showToast('success', message, options);
export const showError = (message: string, options?: Omit<UnifiedToastOptions, 'title'>) => showToast('error', message, options);
export const showInfo = (message: string, options?: Omit<UnifiedToastOptions, 'title'>) => showToast('info', message, options);
export const showWarning = (message: string, options?: Omit<UnifiedToastOptions, 'title'>) => showToast('warning', message, options);
export const showSilent = (message: string, options?: Omit<UnifiedToastOptions, 'title'>) => showToast('silent', message, options);
