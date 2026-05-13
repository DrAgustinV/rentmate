import { toast as sonnerToast, type ToastOptions as SonnerToastOptions } from "sonner";

export type ToastVariant = "success" | "error" | "silent";

export interface ToastOptions extends Omit<SonnerToastOptions, "type" | "duration"> {
  title?: string;
  description?: string;
  duration?: number;
}

const showToast = {
  success: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description">) => {
    return sonnerToast.success(title, { description, ...options });
  },
  error: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description">) => {
    return sonnerToast.error(title, { description, ...options });
  },
  silent: (title: string, description?: string, options?: Omit<ToastOptions, "title" | "description">) => {
    return sonnerToast(title, { description, ...options, duration: options?.duration ?? 0 });
  },
  show: (variant: ToastVariant, title: string, description?: string, options?: Omit<ToastOptions, "title" | "description">) => {
    switch (variant) {
      case "success":
        return showToast.success(title, description, options);
      case "error":
        return showToast.error(title, description, options);
      case "silent":
        return showToast.silent(title, description, options);
      default:
        return showToast.success(title, description, options);
    }
  },
  dismiss: (id?: string) => sonnerToast.dismiss(id),
  remove: (id?: string) => sonnerToast.remove(id),
};

export function useToast() {
  return showToast;
}

export { showToast };
