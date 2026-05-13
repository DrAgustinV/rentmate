import { toast as sonnerToast } from "sonner";

export interface StandardToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export const showToast = {
  success: (options: StandardToastOptions) => {
    sonnerToast.success(options.title, { description: options.description, duration: options.duration ?? 3000 });
  },
  error: (options: StandardToastOptions) => {
    sonnerToast.error(options.title, { description: options.description, duration: options.duration ?? 5000 });
  },
  warning: (options: StandardToastOptions) => {
    sonnerToast.warning(options.title, { description: options.description, duration: options.duration ?? 3000 });
  },
  info: (options: StandardToastOptions) => {
    sonnerToast.info(options.title, { description: options.description, duration: options.duration ?? 3000 });
  },
  silent: (options: StandardToastOptions) => {
    sonnerToast(options.title, { description: options.description, duration: options.duration ?? 2000 });
  },
  show: (title: string, options?: StandardToastOptions) => {
    sonnerToast(title, { description: options?.description, duration: options?.duration });
  },
};

export { showToast as toast };
