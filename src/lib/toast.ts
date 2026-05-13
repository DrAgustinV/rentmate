import { toast } from "sonner";

export type ToastVariant = "success" | "error" | "info" | "silent";

type ToastOptions = Omit<Parameters<typeof toast>[1], "duration">;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  silent: 2000,
};

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, { duration: DEFAULT_DURATIONS.success, ...options });
  },
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, { duration: DEFAULT_DURATIONS.error, ...options });
  },
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, { duration: DEFAULT_DURATIONS.info, ...options });
  },
  silent: (message: string, options?: ToastOptions) => {
    toast(message, { duration: DEFAULT_DURATIONS.silent, ...options });
  },
};

export default showToast;
