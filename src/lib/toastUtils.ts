import { toast as sonnerToast } from "sonner";
import { toast as shadcnToast } from "@/hooks/use-toast";

type ToastVariant = "default" | "destructive" | "success";

interface ToastOptions {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

/**
 * Unified toast utility that uses sonner for most notifications
 * Falls back to shadcn toast if needed for compatibility
 */
export const showToast = {
  success: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    sonnerToast.success(opts.title || "Success", {
      description: opts.description,
      duration: opts.duration,
    });
  },
  
  error: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    sonnerToast.error(opts.title || "Error", {
      description: opts.description,
      duration: opts.duration,
    });
  },
  
  info: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    sonnerToast.info(opts.title || "Info", {
      description: opts.description,
      duration: opts.duration,
    });
  },
  
  warning: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    sonnerToast.warning(opts.title || "Warning", {
      description: opts.description,
      duration: opts.duration,
    });
  },
};

// Auth-specific error messages
export const getAuthErrorMessage = (error: any): string => {
  const errorMessage = error?.message?.toLowerCase() || "";
  
  if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  
  if (errorMessage.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
  }
  
  if (errorMessage.includes("user already registered") || errorMessage.includes("already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  
  if (errorMessage.includes("password") && errorMessage.includes("short")) {
    return "Password must be at least 8 characters long.";
  }
  
  if (errorMessage.includes("email")) {
    return "Please enter a valid email address.";
  }
  
  return error?.message || "An unexpected error occurred. Please try again.";
};
