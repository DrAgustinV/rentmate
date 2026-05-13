import { toast as sonnerToast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "silent";

type ToastOptions = Omit<Parameters<typeof sonnerToast>[1], "duration">;

const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, { duration: 3000, ...options }),
  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, { duration: 5000, ...options }),
  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, { duration: 3000, ...options }),
  silent: (message: string, options?: ToastOptions) =>
    sonnerToast(message, { duration: 0, closeButton: false, ...options }),
  dismiss: (id?: string) => sonnerToast.dismiss(id),
  remove: (id?: string) => sonnerToast.remove(id),
} as const;

export { toast };
