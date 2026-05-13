import { toast } from "sonner";

export interface StandardToastOptions {
  title: string;
  description?: string;
  duration?: number;
}

export const showToast = {
  success: (options: StandardToastOptions) => {
    toast.success(options.title, {
      description: options.description,
      duration: options.duration ?? 3000,
    });
  },
  error: (options: StandardToastOptions) => {
    toast.error(options.title, {
      description: options.description,
      duration: options.duration ?? 5000,
    });
  },
  info: (options: StandardToastOptions) => {
    toast.info(options.title, {
      description: options.description,
      duration: options.duration ?? 3000,
    });
  },
  warning: (options: StandardToastOptions) => {
    toast.warning(options.title, {
      description: options.description,
      duration: options.duration ?? 3000,
    });
  },
  silent: (options: StandardToastOptions) => {
    toast(options.title, {
      description: options.description,
      duration: options.duration ?? 2000,
    });
  },
};
